#!/usr/bin/env python3
"""Phase 3: evaluate production raw/visual paths and LPC-root candidates.
Downloads the authorized research host into runner temp only. Publishes
anonymous aggregate development-set diagnostics, never WAVs or individual rows.
"""
import hashlib,io,json,subprocess,tempfile,urllib.request,zipfile,re,math,os
from pathlib import Path
URL="https://raw.githubusercontent.com/santiagobarreda/hillenbrand_et_al_1995/main/h95-alldata.zip"
VALID=re.compile(r"^[mbgw][0-9]{2}[a-z]{2}$")
IPA={"ae":"æ","ah":"ɑ","aw":"ɔ","eh":"ɛ","er":"ɝ","ei":"eɪ",
     "ey":"eɪ","ih":"ɪ","iy":"i","oa":"oʊ","oo":"ʊ","uh":"ʌ","uw":"u"}
def partition(s):
    value=int(hashlib.sha256(s.encode()).hexdigest()[:8],16)%100
    return "train" if value<70 else "dev" if value<85 else "test"
def rows(content):
    out={}
    for line in content.decode("latin1").splitlines():
        parts=line.split()
        if parts and VALID.fullmatch(parts[0]):out[parts[0]]=parts
    return out
def positive(txt):
    try:
        x=float(txt)
        return x if math.isfinite(x) and x>0 else None
    except (ValueError,TypeError):return None
def mean(items):return round(sum(items)/len(items),3) if items else None
def pct(items,p):
    if not items:return None
    a=sorted(items);return round(a[max(0,math.ceil(len(a)*p)-1)],3)
def metric(rows):
    ok=[r for r in rows if r.get("estimated") and r["error"]["f1_abs_hz"] is not None
          and r["error"]["f2_abs_hz"] is not None]
    e1=[r["error"]["f1_abs_hz"] for r in ok]
    e2=[r["error"]["f2_abs_hz"] for r in ok]
    return {"tokens":len(rows),"detections":sum(bool(r.get("detected")) for r in rows),
      "coverage":round(sum(bool(r.get("detected")) for r in rows)/len(rows),4) if rows else None,
      "paired_acoustic_count":len(ok),"mae_f1_hz":mean(e1),"mae_f2_hz":mean(e2),
      "median_f2_hz":pct(e2,.5),"p90_f2_hz":pct(e2,.9),
      "f2_errors_gt300_hz":sum(x>300 for x in e2),
      "f2_errors_gt500_hz":sum(x>500 for x in e2)}
def row_key(r):return r["audio_path"],r["start_s"],r["end_s"],r["speaker_id"]
def main():
    request=urllib.request.Request(URL,headers={"User-Agent":"VowelScope-Research-Phase3/1.0"})
    with urllib.request.urlopen(request,timeout=120) as stream:archive=stream.read(40_000_000)
    sha=hashlib.sha256(archive).hexdigest()
    with tempfile.TemporaryDirectory(prefix="vowelscope-poles-") as folder:
        root=Path(folder);(root/"audio").mkdir()
        with zipfile.ZipFile(io.BytesIO(archive)) as z:
            acoustic=rows(z.read("vowdata.dat"));timing=rows(z.read("timedata.dat"))
            for section in ("men.zip","women.zip","kids.zip"):
                with zipfile.ZipFile(io.BytesIO(z.read(section))) as inner:
                    for item in inner.infolist():
                        stem=Path(item.filename).stem.lower()
                        if item.filename.lower().endswith(".wav") and VALID.fullmatch(stem) and partition(stem[:3])=="dev":
                            (root/"audio"/(stem+".wav")).write_bytes(inner.read(item))
        samples=[]
        for name,values in sorted(acoustic.items()):
            if not VALID.fullmatch(name) or name not in timing or partition(name[:3])!="dev":continue
            target=root/"audio"/(name+".wav")
            if not target.exists():continue
            f1=positive(values[3]);f2=positive(values[4]);t=timing[name]
            begin=positive(t[1]);finish=positive(t[2]);c1=positive(t[3]);c2=positive(t[4])
            if not all((f1,f2,begin,finish,c1,c2)):continue
            mid=(c1+c2)/2000
            if not (begin<finish and begin/1000<=mid<=finish/1000):continue
            samples.append({"audio_path":"audio/"+name+".wav","speaker_id":name[:3],
              "language":"en-us","vowel_ipa":IPA.get(name[-2:],name[-2:]),
              "gt_f1_hz":f1,"gt_f2_hz":f2,"gt_time_s":mid,
              "gt_f0_hz":positive(values[2]),
              "start_s":begin/1000,"end_s":finish/1000,"split":"dev"})
        if not samples:raise RuntimeError("No DEV recordings loaded")
        manifest={"source":"Hillenbrand et al. (1995)","version":sha[:16],
          "description":"Original published annotated formants, DEV speakers only",
          "samples":samples}
        mf=root/"manifest.json";mf.write_text(json.dumps(manifest),encoding="utf-8")
        designs=[
          ("original_visual","original","visual"),
          ("original_acoustic","original","acoustic"),
          ("pole14_bw700","pole14_bw700","acoustic"),
          ("pole14_bw400","pole14_bw400","acoustic"),
          ("pole16_bw700","pole16_bw700","acoustic"),
          ("pole14_fs9000_bw400","pole14_fs9000_bw400","acoustic"),
          ("pole14_fs12000_bw400","pole14_fs12000_bw400","acoustic"),
          ("pole14_bw400_track05","pole14_bw400_track05","acoustic"),
          ("pole14_bw400_track12","pole14_bw400_track12","acoustic")
        ]
        reports={}
        for label,variant,measurement in designs:
            filename=root/(label+".json")
            args=["node","vowelscope/validation/benchmark.mjs","--manifest",str(mf),
                  "--page","vowelscope/index.html","--mode","classic","--split","dev",
                  "--measurement",measurement,"--dsp-variant",variant,"--out",str(filename)]
            p=subprocess.run(args,capture_output=True,text=True,timeout=360)
            print(label,"status",p.returncode,p.stdout.strip(),p.stderr.strip(),flush=True)
            if p.returncode:raise RuntimeError("Benchmark "+label+" failed: "+p.stderr)
            reports[label]=json.loads(filename.read_text(encoding="utf-8"))
        index={k:{row_key(x):x for x in report["results"]} for k,report in reports.items()}
        keys=set(index["original_visual"])
        if any(set(m)!=keys for m in index.values()):raise RuntimeError("Mismatched development examples")
        good=[key for key in keys if all(
            index[k][key]["error"]["f1_abs_hz"] is not None and
            index[k][key]["error"]["f2_abs_hz"] is not None for k in index)]
        summary={
          "kind":"phase3_lpc_pole_development_ablation",
          "source":"Hillenbrand et al. (1995) (original researcher-authorized hosting)",
          "source_archive_sha256":sha,"source_version":sha[:16],
          "source_commit":os.environ.get("GITHUB_SHA","local"),
          "split":"dev","speaker_disjoint_from_training":True,
          "speaker_count":len({r["speaker_id"] for r in samples}),
          "sample_count":len(samples),"shared_detection_count":len(good),
          "experiment_stage":"Phase 3b: analysis-rate ceiling and temporal pole assignment",
          "variants":list(reports),
          "all_tokens":{k:metric(v["results"]) for k,v in reports.items()},
          "common_detected":{k:metric([m[x] for x in good]) for k,m in index.items()},
          "approximate_computation":{k:{
              "frames":report["summary"].get("benchmark_frames"),
              "sum_cpu_ms":round(report["summary"].get("benchmark_cpu_ms",0),2),
              "mean_per_frame_ms":round(report["summary"].get("benchmark_mean_frame_ms") or 0,3)}
              for k,report in reports.items()},
          "by_cohort":{cohort:{
              variant:metric([r for r in reports[variant]["results"]
                if {"m":"adult_men","w":"adult_women","b":"boys","g":"girls"}.get(r["speaker_id"][:1])==cohort])
                for variant in reports}
              for cohort in ("adult_men","adult_women","boys","girls")},
          "limitations":[
            "LPC pole iteration is a new experimental Durand-Kerner implementation, not the Praat Burg pipeline.",
            "Ceiling variants use anti-aliased resampling to 9/12 kHz and retain the app's fixed 512-sample window, creating an additional window-duration confound.",
            "All pole variants still limit F2 to 3300 Hz; analysis rate is not equivalent to Praat's full formant-ceiling setting.",
            "The CPU timer measures simulated Node VM processing on a hosted CI runner, not mobile browser real-time latency.",
            "The two continuity penalties use preceding accepted frame estimates only; no ground-truth labels or future frames.",
            "Original Hillenbrand F1/F2 annotations are estimates, not error-free physical truths.",
            "Development speakers were used for earlier exploratory studies; these results are not independent validation.",
            "This is numerical WAV replay, not microphone device tests.",
            "No original recordings, per-token predictions, speaker identities or exact audio metadata are published."
          ]
        }
        out=Path("vowelscope/validation/public-dataset/phase3-pole-dev.json")
        out.parent.mkdir(parents=True,exist_ok=True)
        out.write_text(json.dumps(summary,indent=2,ensure_ascii=False)+"\n",encoding="utf-8")
        for name,x in summary["all_tokens"].items():
            print(f"{name}: coverage={x['coverage']:.1%}; F2_MAE={x['mae_f2_hz']}; F2_p90={x['p90_f2_hz']}; n={x['paired_acoustic_count']}",flush=True)
if __name__=="__main__":main()

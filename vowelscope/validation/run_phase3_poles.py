#!/usr/bin/env python3
"""Phase 3: evaluate production raw/visual paths and LPC-root candidates.
Downloads the authorized research host into runner temp only. Publishes
anonymous aggregate development-set diagnostics, never WAVs or individual rows.
"""
import argparse,hashlib,io,json,subprocess,tempfile,zipfile,re,math,sys
from pathlib import Path
from uncertainty import speaker_bootstrap
from corpus_source import ARCHIVE_SHA256, acquire_archive, git_provenance, outside_checkout

CHECKOUT_ROOT=Path(__file__).resolve().parents[2]
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

# Preserve the historical all-variant run when no subset is selected.
DESIGNS=[
    ("original_visual","original","visual"),
    ("original_acoustic","original","acoustic"),
    ("pole14_bw700","pole14_bw700","acoustic"),
    ("pole14_bw400","pole14_bw400","acoustic"),
    ("pole16_bw700","pole16_bw700","acoustic"),
    ("pole14_fs9000_bw400","pole14_fs9000_bw400","acoustic"),
    ("pole14_fs12000_bw400","pole14_fs12000_bw400","acoustic"),
    ("pole14_bw400_track05","pole14_bw400_track05","acoustic"),
    ("pole14_bw400_track12","pole14_bw400_track12","acoustic"),
    ("pole14_fs12000_poly33","pole14_fs12000_poly33","acoustic"),
    ("pole14_fs12000_poly49","pole14_fs12000_poly49","acoustic"),
    ("pole14_fs12000_poly33_fixed_window","pole14_fs12000_poly33_fixed_window","acoustic"),
    ("original_acoustic_zero_safe","linear_zero_safe","acoustic"),
    ("pole14_fs12000_poly_adaptive","pole14_fs12000_poly_adaptive","acoustic")
]

def parse_options(argv=None, checkout_root=None):
    checkout_root=Path(checkout_root or CHECKOUT_ROOT).resolve()
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--archive-cache", type=Path,
                        help="Existing verified archive outside the checkout; never modified")
    parser.add_argument("--out", type=Path,
                        help="New aggregate JSON outside the checkout; existing files are preserved")
    parser.add_argument("--variants", nargs="+", choices=[item[0] for item in DESIGNS],
                        default=[item[0] for item in DESIGNS if item[0] not in
                                 ("original_acoustic_zero_safe","pole14_fs12000_poly_adaptive")])
    parser.add_argument("--smoothing", choices=("default","legacy","fast","none"), default="default")
    options=parser.parse_args(argv)
    options.explicit_out=options.out is not None
    if {"original_acoustic_zero_safe","pole14_fs12000_poly_adaptive"}.intersection(options.variants) and not options.explicit_out:
        raise ValueError("The new DSP experiment requires an explicit external --out")
    if options.explicit_out:
        options.out=outside_checkout(options.out, checkout_root, "Explicit report output")
        if options.out.exists():raise FileExistsError("Report already exists: "+str(options.out))
    else:
        options.out=checkout_root/"vowelscope/validation/public-dataset/phase3-pole-dev.json"
    if options.archive_cache is not None:
        options.archive_cache=outside_checkout(options.archive_cache, checkout_root, "Archive cache")
    if len(set(options.variants))!=len(options.variants):
        parser.error("Duplicate variant labels are not allowed")
    return options

def write_summary(summary, options):
    # Exclusive creation also protects a file created after argument validation.
    if options.explicit_out:
        outside_checkout(options.out, CHECKOUT_ROOT, "Explicit report output")
    options.out.parent.mkdir(parents=True,exist_ok=True)
    with options.out.open("x" if options.explicit_out else "w",encoding="utf-8") as stream:
        stream.write(json.dumps(summary,indent=2,ensure_ascii=False)+"\n")

def run_configuration(options, reports):
    keys=("schema_version","replay_protocol","smoothing","smoothing_value","measurement",
          "dsp_variant","source_html","source_assets","source_commit","source_dirty","code_digest",
          "page_digest","dsp_patch_digest")
    return {"mode":"classic","split":"dev","smoothing":options.smoothing,
            "analysis_windows":{label:{
                "samples":557 if label.endswith("fixed_window") else 512,
                "sample_rate_hz":12000 if "fs12000" in label else 9000 if "fs9000" in label else 11025,
                "nominal_duration_ms":1000*(557 if label.endswith("fixed_window") else 512)/
                    (12000 if "fs12000" in label else 9000 if "fs9000" in label else 11025)
                } for label in reports},
            "page":"vowelscope/index.html","variants":list(reports),
            "speaker_partition":"SHA256(speaker_id)[:8] modulo 100; dev=70..84",
            "source_archive_expected_sha256":ARCHIVE_SHA256,
            "python_version":sys.version.split()[0],
            "node_version":subprocess.check_output(["node","--version"],text=True).strip(),
            "runner_sources_sha256":{
                "validation/"+name:hashlib.sha256(Path(__file__).with_name(name).read_bytes()).hexdigest()
                for name in ("run_phase3_poles.py","corpus_source.py","uncertainty.py")},
            "benchmark_configuration":{label:{key:report[key] for key in keys if key in report}
                                       for label,report in reports.items()}}

def main(argv=None):
    options=parse_options(argv)
    provenance=git_provenance(CHECKOUT_ROOT)
    archive,sha=acquire_archive(options.archive_cache)
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
        designs=[item for item in DESIGNS if item[0] in options.variants]
        reports={}
        for label,variant,measurement in designs:
            filename=root/(label+".json")
            args=["node","vowelscope/validation/benchmark.mjs","--manifest",str(mf),
                  "--page","vowelscope/index.html","--mode","classic","--split","dev",
                  "--measurement",measurement,"--dsp-variant",variant,
                  "--smoothing",options.smoothing,"--out",str(filename)]
            p=subprocess.run(args,capture_output=True,text=True,timeout=360,cwd=CHECKOUT_ROOT)
            print(label,"status",p.returncode,p.stdout.strip(),p.stderr.strip(),flush=True)
            if p.returncode:raise RuntimeError("Benchmark "+label+" failed: "+p.stderr)
            reports[label]=json.loads(filename.read_text(encoding="utf-8"))
        index={k:{row_key(x):x for x in report["results"]} for k,report in reports.items()}
        keys=set(next(iter(index.values())))
        if any(set(m)!=keys for m in index.values()):raise RuntimeError("Mismatched development examples")
        good=[key for key in sorted(keys) if all(
            index[k][key]["error"]["f1_abs_hz"] is not None and
            index[k][key]["error"]["f2_abs_hz"] is not None for k in index)]
        zero_ablation="original_acoustic_zero_safe" in reports and set(reports)<={"original_acoustic","original_acoustic_zero_safe"}
        summary={
          "kind":"classic_zero_interpolation_development_ablation" if zero_ablation else "phase3_lpc_pole_development_ablation",
          "source":"Hillenbrand et al. (1995) (original researcher-authorized hosting)",
          "source_archive_sha256":sha,"source_version":sha[:16],
          **provenance,"run_configuration":run_configuration(options,reports),
          "split":"dev","speaker_disjoint_from_training":True,
          "speaker_count":len({r["speaker_id"] for r in samples}),
          "sample_count":len(samples),"shared_detection_count":len(good),
          "experiment_stage":"Phase 4: exact-zero linear interpolation control" if zero_ablation else "Phase 3b/3c: analysis-rate ceilings, pole tracking, optimized FIR resampling",
          "variants":list(reports),
          "all_tokens":{k:metric(v["results"]) for k,v in reports.items()},
          "speaker_cluster_uncertainty":{k:speaker_bootstrap(v["results"]) for k,v in reports.items()},
          "by_vowel":{vowel:{k:{"metrics":metric([r for r in v["results"] if r["vowel_ipa"]==vowel]),
              "uncertainty":speaker_bootstrap([r for r in v["results"] if r["vowel_ipa"]==vowel])}
              for k,v in reports.items()} for vowel in sorted({r["vowel_ipa"] for r in samples})},
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
          "by_cohort_uncertainty":{cohort:{k:speaker_bootstrap([r for r in v["results"]
              if {"m":"adult_men","w":"adult_women","b":"boys","g":"girls"}.get(r["speaker_id"][:1])==cohort])
              for k,v in reports.items()} for cohort in ("adult_men","adult_women","boys","girls")},
          "limitations":([
            "The correction is an offline finite-PCM interpolation control; classic live preprocessing remains unchanged.",
            "Both compared linear resamplers still lack antialias filtering. This experiment does not validate a new advanced detector.",
            "CPU timing measures simulated Node VM processing on the current host, not mobile-browser latency."
          ] if zero_ablation else [
            "LPC pole iteration is a new experimental Durand-Kerner implementation, not the Praat Burg pipeline.",
            "Historical ceiling variants use 512 samples at 9/12 kHz and change duration; the fixed-window 12-kHz variant uses 557 samples to approximate the original 512/11025-second nominal duration. Exact selected windows are recorded in run_configuration.",
            "All pole variants still limit F2 to 3300 Hz; analysis rate is not equivalent to Praat's full formant-ceiling setting.",
            "The CPU timer measures simulated Node VM processing on the current host, not mobile browser real-time latency.",
            "The two continuity penalties use preceding accepted frame estimates only; no ground-truth labels or future frames."
          ])+[
            "Original Hillenbrand F1/F2 annotations are estimates, not error-free physical truths.",
            "Development speakers were used for earlier exploratory studies; these results are not independent validation.",
            "This is numerical WAV replay, not microphone device tests.",
            "No original recordings, per-token predictions, speaker identities or exact audio metadata are published."
          ]
        }
        write_summary(summary,options)
        for name,x in summary["all_tokens"].items():
            print(f"{name}: coverage={x['coverage']:.1%}; F2_MAE={x['mae_f2_hz']}; F2_p90={x['p90_f2_hz']}; n={x['paired_acoustic_count']}",flush=True)
if __name__=="__main__":main()

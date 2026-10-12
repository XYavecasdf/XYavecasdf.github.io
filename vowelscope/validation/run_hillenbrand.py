#!/usr/bin/env python3
"""Execute the research Hillenbrand baseline in a temporary GitHub runner.

No recordings, excerpts, raw annotated rows, speaker IDs, or user data are
committed. The publicly committed result contains only aggregated metrics.
"""
import hashlib
import io
import json
import os
import re
import subprocess
import sys
import tempfile
import urllib.request
import zipfile
from pathlib import Path

REPO_URL="https://raw.githubusercontent.com/santiagobarreda/hillenbrand_et_al_1995/main/h95-alldata.zip"
# Only the single segment categories get exact IPA quality labels.
# /eɪ/, /oʊ/ and rhotic /ɝ/ still contribute acoustic F1/F2 comparisons,
# but are excluded from monophthong reference-label accuracy.
IPA={
 "ae":"æ","ah":"ɑ","aw":"ɔ","eh":"ɛ","er":"ɝ","ei":"eɪ",
 "ey":"eɪ","ih":"ɪ","iy":"i","oa":"oʊ","oo":"ʊ","uh":"ʌ","uw":"u"
}
ROW=re.compile(r"^[mbgw][0-9]{2}[a-z]{2}$")
def hash_speaker(speaker):
    return int(hashlib.sha256(speaker.encode()).hexdigest()[:8],16)%100
def split(speaker):
    x=hash_speaker(speaker)
    return "train" if x<70 else "dev" if x<85 else "test"
def records(data,min_cols):
    rows={}
    for raw in data.decode("latin1").splitlines():
        fields=raw.split()
        if len(fields)<min_cols or not ROW.fullmatch(fields[0]):continue
        rows[fields[0]]=fields
    return rows
def positive(cell):
    try:
        value=float(cell)
        return value if value>0 else None
    except (ValueError,TypeError):
        return None
def main():
    req=urllib.request.Request(REPO_URL,headers={"User-Agent":"VowelScope-OpenResearch-Validation/0.1"})
    with urllib.request.urlopen(req,timeout=100) as response:
        archive=response.read(40_000_000)
    digest=hashlib.sha256(archive).hexdigest()
    with tempfile.TemporaryDirectory(prefix="vs-h95-") as temp:
        root=Path(temp)
        with zipfile.ZipFile(io.BytesIO(archive)) as z:
            source=records(z.read("vowdata.dat"),16)
            times=records(z.read("timedata.dat"),5)
            if not (1600<=len(source)<=1700 and 1600<=len(times)<=1700):
                raise ValueError(f"Unexpected Hillenbrand row counts {len(source)} and {len(times)}")
            (root/"audio").mkdir()
            audio_count=0
            for section in ["men.zip","women.zip","kids.zip"]:
                with zipfile.ZipFile(io.BytesIO(z.read(section))) as inner:
                    for member in inner.infolist():
                        filename=Path(member.filename).name.lower()
                        if not filename.endswith(".wav"):continue
                        name=filename.removesuffix(".wav")
                        if not ROW.fullmatch(name) or name not in source or name not in times:continue
                        if split(name[:3])!="test":continue
                        target=root/"audio"/filename
                        if target.exists():raise ValueError("Duplicate WAV: "+filename)
                        with target.open("wb") as target_file:
                            target_file.write(inner.read(member))
                        audio_count+=1
        rows=[];missing=0
        for name,fields in sorted(source.items()):
            if name not in times or split(name[:3])!="test":continue
            audio=root/"audio"/(name+".wav")
            if not audio.is_file():missing+=1;continue
            t=times[name]
            start=positive(t[1]);end=positive(t[2]);center1=positive(t[3]);center2=positive(t[4])
            if not (start and end and center1 and center2 and start<end):missing+=1;continue
            middle=(center1+center2)/2000
            if not (start/1000<=middle<=end/1000):missing+=1;continue
            vowel=IPA.get(name[-2:])
            if not vowel:missing+=1;continue
            row={"audio_path":"audio/"+name+".wav","speaker_id":name[:3],"language":"en-us",
                 "source":"Hillenbrand 1995","vowel_ipa":vowel,
                 "start_s":start/1000,"end_s":end/1000,"gt_time_s":middle,"split":"test"}
            pitch=positive(fields[2])
            if pitch is not None:row["gt_f0_hz"]=pitch
            for pos,key in [(3,"gt_f1_hz"),(4,"gt_f2_hz"),(5,"gt_f3_hz")]:
                value=positive(fields[pos])
                if value is not None:row[key]=value
            rows.append(row)
        if not rows or missing:raise ValueError(f"Incomplete test dataset: {len(rows)} rows, {missing} missing/bad")
        manifest={"schema_version":1,"source":"Hillenbrand et al. (1995)","source_url":REPO_URL,
                  "version":digest[:16],
                  "annotation_provenance":"Source vowdata.dat F1/F2/F3 at steady state; source timedata.dat average of judge1 and judge2 center times",
                  "samples":rows}
        mf=root/"manifest.json";mf.write_text(json.dumps(manifest),encoding="utf-8")
        # For hypothesis development, use the remaining speakers' published
        # annotated formants only. Do not load dev/test audio for training.
        model_rows=[]
        for name,fields in sorted(source.items()):
            if name not in times or name[-2:] not in IPA:continue
            f1=positive(fields[3]);f2=positive(fields[4]);pitch=positive(fields[2])
            if f1 is None or f2 is None:continue
            t=times[name];start=positive(t[1]);end=positive(t[2])
            if not start or not end or start>=end:continue
            rr={"audio_path":"audio/"+name+".wav","speaker_id":name[:3],
                "vowel_ipa":IPA[name[-2:]],"language":"en-us",
                "gt_f1_hz":f1,"gt_f2_hz":f2,"start_s":start/1000,
                "end_s":end/1000,"split":split(name[:3])}
            if pitch:rr["gt_f0_hz"]=pitch
            model_rows.append(rr)
        model_manifest={**{k:v for k,v in manifest.items() if k!="samples"},"samples":model_rows}
        model_path=root/"model-manifest.json"
        model_path.write_text(json.dumps(model_manifest),encoding="utf-8")
        stats={"source":"Hillenbrand et al. (1995) vowel corpus",
               "citation":"Hillenbrand, Getty, Clark & Wheeler (1995), JASA 97:3099–3111, DOI:10.1121/1.411872",
               "archive_sha256":digest,
               "source_size_bytes":len(archive),
               "whole_corpus_vowel_rows":len(source),
               "whole_corpus_timing_rows":len(times),
               "selected_heldout_tokens":len(rows),
               "selected_heldout_speakers":len(set(r["speaker_id"] for r in rows)),
               "audio_files_loaded_in_runner":audio_count,
               "heldout_rule":"SHA256(speaker_id)[:8] modulo 100 >= 85; stable speaker-disjoint test set",
               "reference_annotation":"Original Hillenbrand steady-state formants; reference time approximated as mean of Center1/Center2; audio is not redistributed",
               "measure_window":"~150 ms total around mean judged steady-state center",
               "noncomparables":"er/ɝ, ei/eɪ, oa/oʊ included for acoustics but excluded from exact single-IPA-label accuracy",
               "note":"Estimates from the current browser-source LPC, replayed offline into a mock WebAudio buffer; not real-device microphone accuracy",
               "modes":{}}
        all_reports={}
        for mode in ("classic","stable"):
            dest=root/(mode+".json")
            cmd=["node","vowelscope/validation/benchmark.mjs","--manifest",str(mf),
                 "--page","vowelscope/index.html","--mode",mode,"--split","test","--out",str(dest)]
            p=subprocess.run(cmd,capture_output=True,text=True,timeout=330)
            print(f"Benchmark {mode}: {p.returncode} {p.stdout.strip()} {p.stderr.strip()}",flush=True)
            if p.returncode!=0:raise RuntimeError(f"Benchmark {mode} failed: {p.stderr}")
            report=json.loads(dest.read_text(encoding="utf8"))
            all_reports[mode]=report
            summ=report["summary"]
            stats["modes"][mode]={k:v for k,v in summ.items() if k not in ("by_speaker","confusion")}
            stats["modes"][mode]["confusion"]=summ["confusion"]
            stats["modes"][mode]["speaker_counts"]={
                "men":len({r["speaker_id"] for r in rows if r["speaker_id"][0]=="m"}),
                "women":len({r["speaker_id"] for r in rows if r["speaker_id"][0]=="w"}),
                "boys":len({r["speaker_id"] for r in rows if r["speaker_id"][0]=="b"}),
                "girls":len({r["speaker_id"] for r in rows if r["speaker_id"][0]=="g"})}
        oracle=root/"oracle.json"
        p=subprocess.run(["node","vowelscope/validation/benchmark.mjs","--manifest",str(mf),
                "--page","vowelscope/index.html","--split","test","--oracle-only","--out",str(oracle)],
                capture_output=True,text=True,timeout=90)
        print(f"Oracle: {p.returncode} {p.stdout.strip()} {p.stderr.strip()}",flush=True)
        if p.returncode:raise RuntimeError(f"Oracle failed: {p.stderr}")
        diagnostics=Path("vowelscope/validation/public-dataset/phase1-diagnostics.json")
        q=subprocess.run(["python","vowelscope/validation/analyze_phase1.py",
                  "--classic",str(root/"classic.json"),"--stable",str(root/"stable.json"),
                  "--oracle",str(oracle),"--out",str(diagnostics)],
                  capture_output=True,text=True,timeout=90)
        print(f"Diagnostics: {q.returncode} {q.stdout.strip()} {q.stderr.strip()}",flush=True)
        if q.returncode:raise RuntimeError(f"Phase1 diagnostics failed: {q.stderr}")
        summary=json.loads(diagnostics.read_text(encoding="utf-8"))
        # Model hypotheses are selected on unseen-by-training DEV speakers,
        # never fitted against the 23 previously inspected test speakers.
        dev_oracle=root/"oracle-dev.json"
        dev_cmd=["node","vowelscope/validation/benchmark.mjs","--manifest",str(model_path),
                 "--page","vowelscope/index.html","--split","dev","--oracle-only","--out",str(dev_oracle)]
        dp=subprocess.run(dev_cmd,capture_output=True,text=True,timeout=90)
        print("Development oracle:",dp.returncode,dp.stdout.strip(),dp.stderr.strip(),flush=True)
        if dp.returncode:raise RuntimeError("Development oracle failed: "+dp.stderr)
        models_path=Path("vowelscope/validation/public-dataset/classifier-dev-ablation.json")
        model_cmd=["python","vowelscope/validation/classification_experiments.py",
            "--manifest",str(model_path),"--oracle-dev",str(dev_oracle),"--out",str(models_path)]
        mr=subprocess.run(model_cmd,capture_output=True,text=True,timeout=90)
        print("Classification dev study:",mr.returncode,mr.stdout.strip(),mr.stderr.strip(),flush=True)
        if mr.returncode:raise RuntimeError("Classifier experiment failed: "+mr.stderr)
        stats["phase1"]={"oracle_accuracy":summary["oracle"]["accuracy"],
            "oracle_correct":summary["oracle"]["matching_symbols"],
            "oracle_comparable":summary["oracle"]["comparable_tokens"],
            "f2_outliers_gt300_hz":summary["acoustic_error"]["f2_outliers_gt300_hz"],
            "f2_outliers_gt500_hz":summary["acoustic_error"]["f2_outliers_gt500_hz"]}
        raw_classic={x["audio_path"]:x for x in all_reports["classic"]["results"]}
        raw_stable={x["audio_path"]:x for x in all_reports["stable"]["results"]}
        common=[]
        for key,first in raw_classic.items():
            second=raw_stable.get(key)
            if second and all(first["error"].get(q) is not None and second["error"].get(q) is not None
                for q in ("f1_abs_hz","f2_abs_hz")):
                common.append((first,second))
        stats["paired_classic_vs_stable"]={
            "common_acoustic_pairs":len(common),
            "classic_mean_f1_error_hz":sum(a["error"]["f1_abs_hz"] for a,b in common)/len(common) if common else None,
            "stable_mean_f1_error_hz":sum(b["error"]["f1_abs_hz"] for a,b in common)/len(common) if common else None,
            "classic_mean_f2_error_hz":sum(a["error"]["f2_abs_hz"] for a,b in common)/len(common) if common else None,
            "stable_mean_f2_error_hz":sum(b["error"]["f2_abs_hz"] for a,b in common)/len(common) if common else None,
            "warning":"Within-run comparison on the same detected tokens; excludes mode abstentions."
        }
        stats["execution_status"]="complete"
        stats["evaluation_source_commit"]=os.environ.get("GITHUB_SHA","unknown")
        baseline=Path("vowelscope/validation/public-dataset/hillenbrand-baseline.json")
        if baseline.is_file():
            old=json.loads(baseline.read_text(encoding="utf-8"))
            changes={}
            if (old.get("archive_sha256")==digest and
                old.get("selected_heldout_tokens")==len(rows)):
                for mode in ("classic","stable"):
                    baseline_stats=old["modes"][mode]
                    latest=stats["modes"][mode]
                    changes[mode]={
                        "coverage_delta_pp":round(100*(latest["coverage"]-baseline_stats["coverage"]),2),
                        "f1_mae_delta_hz":round(latest["mae_f1_hz"]-baseline_stats["mae_f1_hz"],2),
                        "f2_mae_delta_hz":round(latest["mae_f2_hz"]-baseline_stats["mae_f2_hz"],2),
                        "top1_delta_pp":round(100*(latest["top1_on_all_labeled"]-baseline_stats["top1_on_all_labeled"]),2),
                        "pair_count_delta":latest["acoustic_pairs"]-baseline_stats["acoustic_pairs"]
                    }
                stats["changes_from_initial_baseline"]=changes
                stats["comparison_caveat"]="MAE samples can differ across versions; paired report comparison is preferable for strict regression tests."
            else:stats["comparison_warning"]="Initial baseline dataset digest or split differs; delta comparison omitted."
        output=Path("vowelscope/validation/public-dataset/hillenbrand-latest.json")
        output.parent.mkdir(exist_ok=True,parents=True)
        output.write_text(json.dumps(stats,indent=2,ensure_ascii=False)+"\n",encoding="utf-8")
        print("Completed Hillenbrand baseline. Report: "+str(output),flush=True)
if __name__=="__main__":
    main()

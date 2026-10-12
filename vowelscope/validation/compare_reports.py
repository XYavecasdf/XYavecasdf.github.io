#!/usr/bin/env python3
"""Regression gate for two VowelScope acoustic test reports.
Do not compare different corpora, split memberships or annotated vowel spans."""
import argparse
import json
import math
from pathlib import Path

def read(filename):
    o=json.loads(Path(filename).read_text(encoding="utf-8"))
    if o.get("split")!="test":
        raise ValueError("Regression gate requires test split, not train/dev/all: "+filename)
    return o

def identity(r):
    return (r.get("audio_path"),r.get("start_s"),r.get("end_s"),r.get("speaker_id"),r.get("vowel_ipa"))

def main():
    a=argparse.ArgumentParser(description="Gate VowelScope changes against a fixed held-out corpus")
    a.add_argument("--baseline",required=True)
    a.add_argument("--candidate",required=True)
    a.add_argument("--max-coverage-drop",type=float,default=0.03,help="Allowed absolute coverage drop (default 3 percentage points)")
    a.add_argument("--max-mae-increase",type=float,default=0.10,help="Allowed relative increase in formant MAE (default 10%)")
    a.add_argument("--min-acoustic-pairs",type=int,default=30)
    args=a.parse_args()
    base=read(args.baseline);new=read(args.candidate)
    if (base.get("source"),base.get("dataset_version"))!=(new.get("source"),new.get("dataset_version")):
        raise ValueError("Source/dataset version mismatch; use identical corpus and annotations.")
    bi=sorted(map(identity,base["results"]));ni=sorted(map(identity,new["results"]))
    if bi!=ni or len(set(bi))!=len(bi):
        raise ValueError("Evaluation examples differ or contain ambiguous duplicate IDs.")
    bs=base["summary"];ns=new["summary"]
    if bs["acoustic_pairs"]<args.min_acoustic_pairs or ns["acoustic_pairs"]<args.min_acoustic_pairs:
        raise ValueError("Not enough reference measurements for a reliable automatic regression gate.")
    failures=[]
    print("VowelScope regression test — identical held-out samples")
    for key in ("coverage","mae_f1_hz","mae_f2_hz"):
        old=bs[key];cur=ns[key]
        if old is None or cur is None or not (math.isfinite(old) and math.isfinite(cur)):
            failures.append(key+": missing values");continue
        if key=="coverage":
            limit=old-args.max_coverage_drop
            passed=cur>=limit
        else:
            limit=old*(1+args.max_mae_increase)
            passed=cur<=limit
        print(f"  {key}: baseline={old:.3f}, candidate={cur:.3f}, threshold={limit:.3f} => {'PASS' if passed else 'REGRESSION'}")
        if not passed:failures.append(key)
    if failures:
        print("FAIL: "+", ".join(failures))
        raise SystemExit(1)
    print("PASS: no regression beyond configured tolerances. This is NOT proof of absolute scientific accuracy.")

if __name__=="__main__":
    main()

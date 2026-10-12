#!/usr/bin/env python3
"""DEV-only spectral peak assignment ablations on identical vowel recordings.
Aggregate only: source waveforms and token-level records stay ephemeral.
"""
import argparse
import json
import math
from collections import defaultdict
from pathlib import Path

VARIANTS=("original","peak_prominence","peak_bandwidth","peak_tracking")

def read(path):
    return json.loads(Path(path).read_text(encoding="utf-8"))

def identity(row):
    return row["audio_path"],row["start_s"],row["end_s"],row["speaker_id"]

def quantile(values,part):
    if not values:return None
    a=sorted(values)
    return round(a[max(0,math.ceil(len(a)*part)-1)],2)

def mean(values):
    return round(sum(values)/len(values),2) if values else None

def metrics(rows):
    n=len(rows)
    pairs=[row for row in rows if row["error"]["f1_abs_hz"] is not None and row["error"]["f2_abs_hz"] is not None]
    f1=[r["error"]["f1_abs_hz"] for r in pairs]
    f2=[r["error"]["f2_abs_hz"] for r in pairs]
    return {"total":n,"detections":sum(r["detected"] for r in rows),
            "coverage":round(sum(r["detected"] for r in rows)/n,4) if n else None,
            "acoustic_pairs":len(pairs),
            "f1_mean_abs_hz":mean(f1),"f2_mean_abs_hz":mean(f2),
            "f2_median_abs_hz":quantile(f2,.5),"f2_p90_abs_hz":quantile(f2,.9),
            "f2_gt300":sum(v>300 for v in f2),
            "f2_gt500":sum(v>500 for v in f2)}

def main():
    p=argparse.ArgumentParser()
    for variant in VARIANTS:p.add_argument("--"+variant.replace("_","-"),required=True)
    p.add_argument("--out",required=True)
    args=p.parse_args()
    reports={v:read(getattr(args,v)) for v in VARIANTS}
    if any(r.get("split")!="dev" for r in reports.values()):
        raise ValueError("Peak studies may only use development partition")
    if len({(r["source"],r["dataset_version"]) for r in reports.values()})!=1:
        raise ValueError("Corpus versions differ")
    rows={v:{identity(x):x for x in r["results"]} for v,r in reports.items()}
    ids=set(rows["original"])
    if any(set(v)!=ids for v in rows.values()):raise ValueError("Token sets differ")
    full={v:metrics(list(row.values())) for v,row in rows.items()}
    common=[ident for ident in sorted(ids)
            if all(rows[v][ident]["error"]["f1_abs_hz"] is not None and
                   rows[v][ident]["error"]["f2_abs_hz"] is not None for v in VARIANTS)]
    paired={v:metrics([rows[v][k] for k in common]) for v in VARIANTS}
    by_vowel={}
    for vowel in sorted({r["vowel_ipa"] for r in rows["original"].values()}):
        by_vowel[vowel]={v:metrics([r for r in rr.values() if r["vowel_ipa"]==v]) for v,rr in rows.items()}
    deltas={}
    base=full["original"]
    for name,summary in full.items():
        deltas[name]={
            "coverage_delta_percentage_points":round(100*(summary["coverage"]-base["coverage"]),2),
            "f2_mean_abs_delta_hz":round(summary["f2_mean_abs_hz"]-base["f2_mean_abs_hz"],2),
            "f2_p90_delta_hz":round(summary["f2_p90_abs_hz"]-base["f2_p90_abs_hz"],2),
            "f2_gt300_delta":summary["f2_gt300"]-base["f2_gt300"]}
    out={
        "kind":"vowelscope_dev_peak_selection_research",
        "corpus":reports["original"]["source"],
        "corpus_version":reports["original"]["dataset_version"],
        "split":"dev","variants":list(VARIANTS),
        "all_tokens":full,"common_detected_token_count":len(common),
        "common_detected":paired,"by_vowel":by_vowel,
        "relative_to_original":deltas,
        "interpretation_guardrails":[
          "Half-power width is inferred from an LPC spectrum grid and is not the bandwidth derived from a fitted AR pole.",
          "Frequency estimates here have been processed through the actual VowelScope frame tracker; isolated-peak audit results are not directly comparable.",
          "Conditional formant errors and detection coverage must be interpreted together.",
          "This is a development-set hypothesis evaluation. Never choose coefficients on the earlier inspected test data.",
          "Original site source is unchanged; peak variants are research-only patches."
        ]
    }
    dest=Path(args.out);dest.parent.mkdir(parents=True,exist_ok=True)
    dest.write_text(json.dumps(out,indent=2,ensure_ascii=False)+"\n",encoding="utf-8")
    for name in VARIANTS:
        m=full[name]
        print(f"{name}: coverage={m['coverage']*100:.1f}%; "
              f"F2 MAE={m['f2_mean_abs_hz']} Hz; F2 p90={m['f2_p90_abs_hz']} Hz",flush=True)

if __name__=="__main__":main()

#!/usr/bin/env python3
"""Phase 1: aggregate oracle decomposition and acoustic outlier analysis.
Private per-token input reports remain in temporary runner space. Output is only
aggregated statistics, with no original recordings or identifiable token rows.
"""
import argparse
import json
import math
from collections import defaultdict
from pathlib import Path

def load(p):
    return json.loads(Path(p).read_text(encoding="utf-8"))
def stat(v):
    v=sorted(float(x) for x in v if x is not None and math.isfinite(float(x)))
    if not v:return None
    return {"n":len(v),"mean":round(sum(v)/len(v),2),
            "median":round((v[(len(v)-1)//2]+v[len(v)//2])/2,2),
            "p90":round(v[math.ceil(.9*len(v))-1],2)}
def fraction(x,n):return round(x/n,4) if n else None
def group_name(s):
    return {"m":"adult_men","w":"adult_women","b":"boys","g":"girls"}.get(s[:1],"unspecified")
def f0_bucket(f):
    if f is None or f<=0:return "unavailable"
    if f<140:return "under_140_Hz"
    if f<230:return "140_to_230_Hz"
    return "230_Hz_and_above"
def analyze(classic,stable,oracle):
    c=load(classic);s=load(stable);o=load(oracle)
    if any(x.get("split")!="test" for x in (c,s,o)):
        raise ValueError("Phase1 report requires test split.")
    if len({(x.get("source"),x.get("dataset_version")) for x in (c,s,o)})!=1:
        raise ValueError("Source versions differ.")
    def key(r):return (r["audio_path"],r["start_s"],r["end_s"],r["speaker_id"])
    classic_rows={key(r):r for r in c["results"]}
    stable_rows={key(r):r for r in s["results"]}
    oracle_rows={key(r):r for r in o["results"]}
    if classic_rows.keys()!=stable_rows.keys() or classic_rows.keys()!=oracle_rows.keys():
        raise ValueError("Evaluation tokens differ.")
    cases={"both_correct":0,"oracle_correct_but_live_wrong_or_missing":0,
           "both_wrong":0,"live_correct_but_oracle_wrong":0}
    acoustic=defaultdict(list); groups=defaultdict(list); labels=defaultdict(list)
    near_bad=defaultdict(list); high_f2=0; high_f2_over500=0; countpairs=0
    high_f0=defaultdict(list); low_counts=defaultdict(list)
    for key,cur in classic_rows.items():
        ref=oracle_rows[key]
        if ref["label_match"] is not None:
            oracle_ok=bool(ref["label_match"])
            live_ok=bool(cur["label_match"])
            if oracle_ok and live_ok:cases["both_correct"]+=1
            elif oracle_ok:cases["oracle_correct_but_live_wrong_or_missing"]+=1
            elif live_ok:cases["live_correct_but_oracle_wrong"]+=1
            else:cases["both_wrong"]+=1
        x=cur["error"]["f1_abs_hz"];y=cur["error"]["f2_abs_hz"]
        group=group_name(cur["speaker_id"])
        binname=f0_bucket(cur.get("gt_f0_hz"))
        labels[cur["vowel_ipa"]].append(cur)
        groups[group].append(cur)
        high_f0[binname].append(cur)
        if x is None or y is None:
            low_counts[group].append(cur)
            continue
        countpairs+=1
        acoustic["all"].append((x,y))
        acoustic["group:"+group].append((x,y))
        acoustic["vowel:"+cur["vowel_ipa"]].append((x,y))
        acoustic["f0:"+binname].append((x,y))
        if y>300: high_f2+=1
        if y>500: high_f2_over500+=1
        if y>300:near_bad[cur["vowel_ipa"]].append(y)
    def pair_summary(pairs):
        return {"n":len(pairs),"f1_abs_hz":stat([a for a,b in pairs]),
            "f2_abs_hz":stat([b for a,b in pairs]),
            "f2_gt300_hz":sum(b>300 for a,b in pairs),
            "f2_gt500_hz":sum(b>500 for a,b in pairs)}
    by_group={}
    for g,rows in groups.items():
        by_group[g]={"tokens":len(rows),"detected":sum(r["detected"] for r in rows),
            "coverage":fraction(sum(r["detected"] for r in rows),len(rows)),
            "acoustics":pair_summary(acoustic["group:"+g])}
    by_vowel={}
    for v,rows in labels.items():
        by_vowel[v]={"tokens":len(rows),"detected":sum(r["detected"] for r in rows),
            "coverage":fraction(sum(r["detected"] for r in rows),len(rows)),
            "acoustics":pair_summary(acoustic["vowel:"+v])}
    f0_groups={}
    for g,rows in high_f0.items():
        f0_groups[g]={"tokens":len(rows),"coverage":fraction(sum(r["detected"] for r in rows),len(rows)),
            "acoustics":pair_summary(acoustic["f0:"+g])}
    paired=[]
    for k,a in classic_rows.items():
        b=stable_rows[k]
        if all(a["error"][f] is not None and b["error"][f] is not None
               for f in ("f1_abs_hz","f2_abs_hz")):paired.append((a,b))
    comparison={"common_tokens":len(paired),
       "classic_f1_mae_hz":stat([a["error"]["f1_abs_hz"] for a,b in paired])["mean"] if paired else None,
       "stable_f1_mae_hz":stat([b["error"]["f1_abs_hz"] for a,b in paired])["mean"] if paired else None,
       "classic_f2_mae_hz":stat([a["error"]["f2_abs_hz"] for a,b in paired])["mean"] if paired else None,
       "stable_f2_mae_hz":stat([b["error"]["f2_abs_hz"] for a,b in paired])["mean"] if paired else None}
    return {
        "schema_version":1,
        "description":"Research decomposition on previously viewed speaker-disjoint Hillenbrand holdout. Exploratory only; do not tune on this holdout.",
        "source":c["source"],"dataset_version":c["dataset_version"],
        "selected_tokens":len(classic_rows),
        "oracle":{"comparable_tokens":o["summary"]["comparable"],
          "matching_symbols":o["summary"]["correct"],
          "accuracy":o["summary"]["exact_symbol_accuracy"],
          "by_vowel":o["summary"]["by_vowel"],
          "confusion":o["summary"]["confusion"]},
        "original_classifier":{"comparable_tokens":c["summary"]["label_examples"],
          "matching_symbols":int(round(c["summary"]["label_examples"]*c["summary"]["top1_on_all_labeled"])),
          "accuracy":c["summary"]["top1_on_all_labeled"]},
        "error_decomposition":{"counts":cases,"explanation":{
          "both_wrong":"IPA chart/label mismatch is sufficient to fail even with corpus F1/F2, but cannot prove it is the only cause.",
          "oracle_correct_but_live_wrong_or_missing":"Acoustic estimation, tracking or detection changes the classification from correct to wrong.",
          "live_correct_but_oracle_wrong":"Estimation noise can coincidentally move the marker toward the nominal target label.",
          "both_correct":"Both ideal input and live estimate identify the same annotated broad IPA symbol."}},
        "acoustic_error":{"all":pair_summary(acoustic["all"]),
          "by_speaker_group":by_group,"by_reference_f0_group":f0_groups,
          "by_annotated_vowel":by_vowel,
          "f2_outliers_gt300_hz":high_f2,"f2_outliers_gt500_hz":high_f2_over500,
          "note":"Conditional errors on successful frames. All participants anonymous; group metrics are exploratory."},
        "paired_modes":comparison,
        "caveats":[
          "Corpus F1/F2 annotations are reference estimates, not perfectly objective truths.",
          "IPA labels are broad category symbols; a fixed 28-point diagram is not a validated American English phoneme recognizer.",
          "The held-out tokens have already been inspected in previous reports. Use distinct development speakers or another unseen corpus for choosing hyperparameters.",
          "F0 strata and age/sex categories are descriptive and confounded; group differences do not establish cause.",
          "This replays waveforms numerically into browser functions, not actual mobile microphones."
        ]
    }

def main():
    p=argparse.ArgumentParser()
    for key in ("classic","stable","oracle","out"):p.add_argument("--"+key,required=True)
    a=p.parse_args()
    result=analyze(a.classic,a.stable,a.oracle)
    dest=Path(a.out);dest.parent.mkdir(parents=True,exist_ok=True)
    dest.write_text(json.dumps(result,indent=2,ensure_ascii=False)+"\n",encoding="utf-8")
    print(f"Oracle exact symbol match: {result['oracle']['matching_symbols']}/{result['oracle']['comparable_tokens']} "
          f"({result['oracle']['accuracy']:.1%}).",flush=True)
    print("F2 > 300 Hz outliers:",result["acoustic_error"]["f2_outliers_gt300_hz"],flush=True)
    print("Report:",dest,flush=True)
if __name__=="__main__": main()

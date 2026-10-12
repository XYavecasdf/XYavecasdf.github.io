#!/usr/bin/env python3
"""Dev-only VowelScope EMA smoothing ablation on same recordings."""
import argparse,json,math
from pathlib import Path
def read(x):return json.loads(Path(x).read_text(encoding="utf-8"))
def ident(x):return x["audio_path"],x["start_s"],x["end_s"],x["speaker_id"]
def ave(a):return round(sum(a)/len(a),2) if a else None
def q(a,p):
    if not a:return None
    v=sorted(a);return round(v[max(0,math.ceil(len(v)*p)-1)],2)
def metrics(rs):
    pairs=[r for r in rs if r["error"]["f1_abs_hz"] is not None and r["error"]["f2_abs_hz"] is not None]
    err1=[r["error"]["f1_abs_hz"] for r in pairs];err2=[r["error"]["f2_abs_hz"] for r in pairs]
    return {"n":len(rs),"coverage":round(sum(r["detected"] for r in rs)/len(rs),4),
        "paired":len(pairs),"f1_mae_hz":ave(err1),"f2_mae_hz":ave(err2),
        "f2_p90_hz":q(err2,.9),"f2_gt300":sum(v>300 for v in err2),"f2_gt500":sum(v>500 for v in err2)}
def main():
    a=argparse.ArgumentParser()
    for n in ("default","fast","none"):a.add_argument("--"+n,required=True)
    a.add_argument("--out",required=True)
    args=a.parse_args();names=("default","fast","none")
    reports={k:read(getattr(args,k)) for k in names}
    if any(r.get("split")!="dev" or r.get("dsp_variant")!="original" or r.get("smoothing")!=k for k,r in reports.items()):
        raise ValueError("Need unchanged original LPC with consistent DEV smoothing variants")
    if len({(r["source"],r["dataset_version"]) for r in reports.values()})!=1:
        raise ValueError("Mismatched data")
    by={k:{ident(r):r for r in v["results"]} for k,v in reports.items()}
    keys=set(by["default"])
    if any(set(x)!=keys for x in by.values()):raise ValueError("Different examples")
    both=[key for key in keys if all(by[k][key]["error"]["f2_abs_hz"] is not None and
        by[k][key]["error"]["f1_abs_hz"] is not None for k in names)]
    result={"kind":"dev_smoothing_ablation","n":len(keys),"split":"dev",
        "source":reports["default"]["source"],
        "all_tokens":{k:metrics(list(v.values())) for k,v in by.items()},
        "common_n":len(both),"common_tokens":{k:metrics([v[key] for key in both]) for k,v in by.items()},
        "note":"Research-only values for the actual webpage's smoothing coefficient: default slider=60 alpha=.32, fast slider=0 alpha=.68, none alpha~1. These are not newly trained models.",
        "limitations":"Offline browser replay; this test compares temporal smoothing, not speech recognition; no changes made to production code."}
    out=Path(args.out);out.parent.mkdir(parents=True,exist_ok=True)
    out.write_text(json.dumps(result,indent=2,ensure_ascii=False)+"\n",encoding="utf-8")
    for k,m in result["all_tokens"].items():
        print(k,m["coverage"],m["f2_mae_hz"],m["f2_p90_hz"],flush=True)
if __name__=="__main__":main()

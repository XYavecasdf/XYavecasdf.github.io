#!/usr/bin/env python3
"""Language-specific F1/F2 vowel classifiers trained without test-speaker data.

An exploratory *development-split* comparison, not production recognition.
Runs on the corpus's existing manually provided reference formants and labels.
"""
import argparse
import json
import math
from collections import defaultdict
from pathlib import Path

ALLOWED=("æ","ɑ","ɔ","ɛ","ɪ","i","ʊ","ʌ","u")
def cohort(s):return {"m":"men","w":"women","b":"boys","g":"girls"}.get(s[:1],"other")
def normalize(row):
    a=row.get("gt_f1_hz");b=row.get("gt_f2_hz")
    if a is None or b is None or a<=0 or b<=0:return None
    return (math.log(a),math.log(b))
def stdev(vals,mean):
    return math.sqrt(max(1e-5,sum((x-mean)**2 for x in vals)/max(len(vals)-1,1)))
def accuracy(records,fn):
    total=0;good=0;group=defaultdict(lambda:[0,0])
    matrix=defaultdict(lambda:defaultdict(int))
    for row in records:
        x=normalize(row)
        if x is None or row["vowel_ipa"] not in ALLOWED:continue
        predicted=fn(row,x)
        total+=1
        match=predicted==row["vowel_ipa"]
        good+=match
        k=cohort(row["speaker_id"])
        group[k][0]+=1;group[k][1]+=match
        matrix[row["vowel_ipa"]][predicted]+=1
    return {"n":total,"correct":good,"accuracy":good/total if total else None,
        "by_cohort":{k:{"n":v[0],"correct":v[1],"accuracy":v[1]/v[0]} for k,v in group.items()},
        "confusion":{k:dict(v) for k,v in matrix.items()}}
def fit(rows,grouping=False):
    examples=defaultdict(list)
    for row in rows:
        x=normalize(row)
        if x and row["vowel_ipa"] in ALLOWED:
            prefix=cohort(row["speaker_id"]) if grouping else "all"
            examples[(prefix,row["vowel_ipa"])].append(x)
    out={}
    for key,vals in examples.items():
        mu1=sum(x[0] for x in vals)/len(vals)
        mu2=sum(x[1] for x in vals)/len(vals)
        out[key]={"n":len(vals),"mu":(mu1,mu2),
                  "sd":(stdev([x[0] for x in vals],mu1),stdev([x[1] for x in vals],mu2))}
    return out
def classify(x,model,cohort_id="all",kind="centroid"):
    # Only infer among label categories actually represented by this test task,
    # not all 28 international IPA qualities.
    candidates={v:model.get((cohort_id,v)) for v in ALLOWED}
    # Sparse cohorts fall back to pooled, adult/child conditions are still research-only.
    if any(z is None or z["n"]<4 for z in candidates.values()):
        candidates={v:model.get(("all",v)) for v in ALLOWED}
    if any(z is None for z in candidates.values()):raise ValueError("Missing training class")
    pooled=(.19,.24) # research baseline scale in log-F1 and log-F2, held constant
    def distance(params):
        a,b=params["mu"]
        if kind=="gaussian":
            sd1=max(.13,params["sd"][0]);sd2=max(.15,params["sd"][1])
            return (x[0]-a)**2/sd1**2+(x[1]-b)**2/sd2**2+2*math.log(sd1*sd2)
        return ((x[0]-a)/pooled[0])**2+((x[1]-b)/pooled[1])**2
    return min(candidates,key=lambda k:distance(candidates[k]))
def main():
    ap=argparse.ArgumentParser()
    ap.add_argument("--manifest",required=True)
    ap.add_argument("--oracle-dev",required=True)
    ap.add_argument("--live-dev",required=True)
    ap.add_argument("--out",required=True)
    args=ap.parse_args()
    manifest=json.loads(Path(args.manifest).read_text(encoding="utf8"))
    rows=manifest["samples"]
    train=[x for x in rows if x.get("split")=="train"]
    dev=[x for x in rows if x.get("split")=="dev"]
    test=[x for x in rows if x.get("split")=="test"]
    if not train or not dev or not test:raise ValueError("Missing speaker-disjoint train/dev/test split")
    subsets=[set(x["speaker_id"] for x in rr) for rr in (train,dev,test)]
    if any(subsets[i]&subsets[j] for i in range(3) for j in range(i+1,3)):
        raise ValueError("Speaker overlap between train/dev/test")
    oracle=json.loads(Path(args.oracle_dev).read_text(encoding="utf8"))
    if oracle.get("split")!="dev":raise ValueError("Need independent development oracle result")
    oracle_dev={x["audio_path"]:x for x in oracle["results"]}
    eligible=[x for x in dev if normalize(x) and x["vowel_ipa"] in ALLOWED]
    expected=set(x["audio_path"] for x in eligible)
    if not expected.issubset(oracle_dev.keys()):raise ValueError("Missing oracle dev data")
    def original(row,_):
        return oracle_dev[row["audio_path"]]["oracle_ipa"]
    live=json.loads(Path(args.live_dev).read_text(encoding="utf8"))
    if live.get("split")!="dev":raise ValueError("Development live results required")
    live_by_audio={x["audio_path"]:x for x in live["results"]}
    if not set(x["audio_path"] for x in dev).issubset(live_by_audio.keys()):
        raise ValueError("Live benchmark missing development tokens")
    pooled=fit(train)
    grouped={**pooled,**fit(train,grouping=True)}
    models={
      "generic_28_ipa_reference":accuracy(dev,original),
      "en_us_train_only_log_centroid":accuracy(dev,lambda r,x:classify(x,pooled)),
      "en_us_train_only_gaussian_diag":accuracy(dev,lambda r,x:classify(x,pooled,kind="gaussian")),
      "en_us_cohort_centroid_exploratory":accuracy(dev,lambda r,x:classify(x,grouped,cohort(r["speaker_id"])))
    }
    def live_accuracy(fn):
        n=0;correct=0;available=0;groups=defaultdict(lambda:[0,0,0])
        for row in dev:
            if row["vowel_ipa"] not in ALLOWED or not normalize(row):continue
            old=live_by_audio[row["audio_path"]]
            est=old.get("estimated")
            valid=bool(est and est.get("f1") and est.get("f2") and est["f1"]>0 and est["f2"]>0)
            prediction=fn(row,(math.log(est["f1"]),math.log(est["f2"]))) if valid else None
            match=prediction==row["vowel_ipa"]
            n+=1;correct+=match;available+=valid
            k=cohort(row["speaker_id"])
            groups[k][0]+=1;groups[k][1]+=valid;groups[k][2]+=match
        return {"n":n,"detected":available,"coverage":available/n if n else None,
                "correct":correct,"accuracy_on_all":correct/n if n else None,
                "accuracy_when_detected":correct/available if available else None,
                "by_cohort":{k:{"n":v[0],"detected":v[1],"correct":v[2],
                  "accuracy_on_all":v[2]/v[0]} for k,v in groups.items()}}
    live_models={
      "generic_28_ipa_reference":live_accuracy(lambda r,x:live_by_audio[r["audio_path"]].get("predicted_ipa")),
      "en_us_train_only_log_centroid":live_accuracy(lambda r,x:classify(x,pooled)),
      "en_us_train_only_gaussian_diag":live_accuracy(lambda r,x:classify(x,pooled,kind="gaussian")),
      "en_us_cohort_centroid_exploratory":live_accuracy(lambda r,x:classify(x,grouped,cohort(r["speaker_id"])))
    }
    summary={
      "kind":"development_only_classifier_ablation",
      "dataset_version":manifest["version"],
      "speaker_disjoint":True,
      "speaker_counts":{"train":len(subsets[0]),"dev":len(subsets[1]),"test_untouched_for_model_selection":len(subsets[2])},
      "token_counts":{"train":len(train),"dev":len(dev),"test":len(test)},
      "classes":list(ALLOWED),
      "model_results":models,
      "live_lpc_model_results":live_models,
      "warning":"model_results uses corpus reference F1/F2; live_lpc_model_results uses VowelScope actual LPC estimates replayed offline. Both evaluate dev speakers only, not real mobile microphone performance.",
      "no_test_model_evaluation":True,
      "license":"Only derived aggregate statistics; source audio and per-token measurements stay in the temporary runner."
    }
    dest=Path(args.out);dest.parent.mkdir(parents=True,exist_ok=True)
    dest.write_text(json.dumps(summary,indent=2,ensure_ascii=False)+"\n",encoding="utf8")
    for name,result in models.items():
        l=live_models[name]
        print(f"Dev oracle {name}: {result['correct']}/{result['n']} ({result['accuracy']:.1%}); "
              f"actual LPC {l['correct']}/{l['n']} ({l['accuracy_on_all']:.1%})",flush=True)
if __name__=="__main__": main()

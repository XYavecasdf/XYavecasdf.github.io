#!/usr/bin/env python3
"""Aggregate dev-only DSP ablations; publish statistics, never per-token traces."""
import argparse,json,math
from pathlib import Path
from report_context import report_context
def read(p):return json.loads(Path(p).read_text(encoding='utf-8'))
def percentile(values,p):
    xs=sorted(values)
    if not xs:return None
    return round(xs[max(0,min(len(xs)-1,math.ceil(p*len(xs))-1))],2)
def avg(values):return round(sum(values)/len(values),2) if values else None
def key(row):
    return (row['audio_path'],row['start_s'],row['end_s'],row['speaker_id'])
def error(row,column):
    return row['error'].get(column)
def main():
    p=argparse.ArgumentParser()
    p.add_argument('--original',required=True)
    p.add_argument('--antialias',required=True)
    p.add_argument('--burg',required=True)
    p.add_argument('--burg-antialias',required=True)
    p.add_argument('--out',required=True)
    args=p.parse_args()
    raw={
      'original':read(args.original),
      'antialias':read(args.antialias),
      'burg':read(args.burg),
      'burg_antialias':read(args.burg_antialias)}
    if any(v.get('split')!='dev' for v in raw.values()):
        raise ValueError('DSP research requires DEV examples only.')
    if len({(v.get('source'),v.get('dataset_version')) for v in raw.values()})!=1:
        raise ValueError('Different dataset or annotation version')
    sets={name:{key(r):r for r in obj['results']} for name,obj in raw.items()}
    canonical=set(sets['original'])
    if any(set(d)!=canonical for d in sets.values()):
        raise ValueError('Different examples across experimental DSP variants')
    metrics={}
    for name,rs in sets.items():
        s=raw[name]['summary']
        err1=[error(r,'f1_abs_hz') for r in rs.values()]
        err2=[error(r,'f2_abs_hz') for r in rs.values()]
        a=[x for x in err1 if x is not None]
        b=[x for x in err2 if x is not None]
        metrics[name]={'n':len(rs),'detected':s['detected'],
            'coverage':round(s['coverage'],4),'acoustic_pairs':s['acoustic_pairs'],
            'mean_f1_abs_hz':avg(a),'mean_f2_abs_hz':avg(b),
            'median_f2_abs_hz':percentile(b,.5),
            'p90_f2_abs_hz':percentile(b,.9),
            'f2_gt300':sum(x>300 for x in b),
            'f2_gt500':sum(x>500 for x in b)}
    common=[ident for ident in canonical if all(
        error(sets[name][ident],'f1_abs_hz') is not None and
        error(sets[name][ident],'f2_abs_hz') is not None for name in sets)]
    matched={}
    for name,rs in sets.items():
        f1=[error(rs[k],'f1_abs_hz') for k in common]
        f2=[error(rs[k],'f2_abs_hz') for k in common]
        matched[name]={'n':len(common),'mae_f1_hz':avg(f1),'mae_f2_hz':avg(f2),
                       'p90_f2_hz':percentile(f2,.9)}
    result={'replay_configurations':{k:report_context(r) for k,r in raw.items()},'kind':'research_dev_dsp_ablation','dataset_version':raw['original'].get('dataset_version'),
      'source':raw['original'].get('source'),
      'note':'Same production VowelScope estimator with offline experimental preprocess and/or Burg AR substitution; no changes deployed on the live website.',
      'development_only':True,'metrics':metrics,'common_detection_comparison':matched,
      'limitations':[
          'The Burg substitute uses the existing production spectral peak picker; it does not replicate Praat end-to-end.',
          'Experimental FIR low-pass uses a short 33-tap window; its transition band and real-device latency need independent validation.',
          'F1/F2 corpus annotations and analysis time window create measurement uncertainty.',
          'Relative differences on this development set are hypotheses, not evidence of generalization to unseen speakers or mobile devices.'
      ]}
    target=Path(args.out);target.parent.mkdir(parents=True,exist_ok=True)
    target.write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    for name,m in metrics.items():
        print(f"{name}: coverage {m['coverage']:.1%}, F2 MAE {m['mean_f2_abs_hz']} Hz, p90 {m['p90_f2_abs_hz']} Hz",flush=True)
if __name__=='__main__':main()

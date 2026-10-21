"""Deterministic speaker-cluster percentile intervals; never publishes token IDs."""
import math
import random


def nearest_rank(values, probability):
    if not values:return None
    ordered=sorted(values)
    return ordered[max(0,math.ceil(probability*len(ordered))-1)]


def speaker_bootstrap(rows,replicates=2000,seed=20261013):
    if not isinstance(replicates,int) or replicates<1:raise ValueError('Invalid bootstrap count')
    clusters={}
    for row in rows:
        speaker=row.get('speaker_id')
        if not isinstance(speaker,str) or not speaker:raise ValueError('Speaker cluster ID required')
        clusters.setdefault(speaker,[]).append(row)
    speakers=sorted(clusters)
    values={key:[] for key in ('coverage','mae_f1_hz','mae_f2_hz','p90_f2_hz')}
    undefined=0;rng=random.Random(seed)
    for _ in range(replicates if speakers else 0):
        sampled=[row for speaker in rng.choices(speakers,k=len(speakers)) for row in clusters[speaker]]
        values['coverage'].append(sum(bool(r.get('detected')) for r in sampled)/len(sampled))
        paired=[r for r in sampled if r.get('detected') and all(
            isinstance(r.get('error',{}).get(key),(int,float)) and math.isfinite(r['error'][key])
            for key in ('f1_abs_hz','f2_abs_hz'))]
        if not paired:undefined+=1;continue
        e1=[r['error']['f1_abs_hz'] for r in paired];e2=[r['error']['f2_abs_hz'] for r in paired]
        values['mae_f1_hz'].append(sum(e1)/len(e1))
        values['mae_f2_hz'].append(sum(e2)/len(e2))
        values['p90_f2_hz'].append(nearest_rank(e2,.9))
    return {'method':'95% percentile speaker-cluster bootstrap; all tokens per resampled speaker',
            'speaker_count':len(speakers),'token_count':len(rows),'replicates':replicates,'seed':seed,
            'undefined_error_replicates':undefined,
            'intervals':{key:[round(nearest_rank(v,.025),4),round(nearest_rank(v,.975),4)] if v else [None,None]
                         for key,v in values.items()},
            'caveat':'Exploratory uncertainty; few-speaker subgroups and repeatedly inspected DEV data do not establish independent validity.'}

"""Prepare a private, unscored L2-ARCTIC reference-review queue.

The public corpus contains phone annotations, not reviewed formant references.
No VowelScope/Praat estimates are computed here and no final accuracy is claimed.
"""
import argparse
from collections import Counter
import hashlib
import io
import json
import math
from pathlib import Path
import re
import urllib.request
import wave

from corpus_source import git_provenance, outside_checkout

REPO='tienanhdev1401/l2arctic_data'
REVISION='81b4ebae862d238ca58e0367d308b9787511e369'
DOCUMENT_HASHES={
    'README.md':'2830cad62115ac138de891b581d0678dd8504438418a607086727a2cf2d0f53a',
    'LICENSE':'b1d636fddd729d8185d89af1e41e21a311866fcf3d4040cc4906a64837d0f218'}
VOWELS={'AA','AE','AH','AO','AX','EH','ER','IH','IY','UH','UW','AW','AY','EY','OW','OY'}
CHECKOUT=Path(__file__).resolve().parents[2]


def parse_phones(text):
    tiers=re.split(r'(?m)^\s*item\s*\[\d+\]:\s*',text)[1:]
    matches=[tier for tier in tiers if re.search(r'\bname\s*=\s*"phones"',tier)]
    if len(matches)!=1:raise ValueError('Expected exactly one phones interval tier')
    sizes=re.findall(r'intervals:\s*size\s*=\s*(\d+)',matches[0])
    indices=re.findall(r'intervals\s*\[(\d+)\]:',matches[0])
    if len(sizes)!=1 or int(sizes[0])!=len(indices) or indices!=[str(i) for i in range(1,len(indices)+1)]:
        raise ValueError('Incomplete or nonsequential declared phone intervals')
    pattern=r'intervals\s*\[\d+\]:\s*xmin\s*=\s*([^\s]+)\s*xmax\s*=\s*([^\s]+)\s*text\s*=\s*"((?:[^"]|"")*)"'
    rows=re.findall(pattern,matches[0])
    if len(rows)!=len(indices):
        raise ValueError('Incomplete phone intervals')
    return [(float(start),float(end),label.replace('""','"')) for start,end,label in rows]


def perceived_vowel(label):
    parts=[part.strip() for part in label.split(',')]
    warning=len(parts)>1 or '*' in label
    if len(parts)==3:
        canonical,actual,operation=parts
        operation=operation.lower()
        if operation not in {'s','a','d'} or not canonical or not actual:
            raise ValueError('Unknown or incomplete phone annotation operation')
        if (operation=='a' and canonical.lower()!='sil') or (operation=='d' and actual.lower()!='sil'):
            raise ValueError('Inconsistent addition/deletion phone annotation')
    elif len(parts)==1:actual=parts[0]
    else:raise ValueError('Malformed multi-part phone annotation')
    actual=re.sub(r'[012*]','',actual).upper()
    return (actual if actual in VOWELS else None,warning)


def candidate_windows(intervals):
    candidates=[];reasons=Counter();previous=0.0
    for start,end,label in intervals:
        if not all(math.isfinite(v) for v in (start,end)) or start<0 or end<=start or start<previous-1e-8:
            raise ValueError('Invalid or overlapping phone intervals')
        previous=end
        phone,warning=perceived_vowel(label)
        if phone is None:reasons['non_vowel_or_ambiguous']+=1;continue
        if end-start<.1-1e-8:reasons['shorter_than_100_ms']+=1;continue
        candidates.append({'start_s':start,'end_s':end,'actual_phone':phone,
            'annotation_warning':warning,'proposed_reference_time_s':(start+end)/2,
            'gt_time_s':None,'gt_f1_hz':None,'gt_f2_hz':None,
            'reference_review_status':'pending'})
    return candidates,dict(reasons)


def cached_get(cache,relative,url,limit):
    """Pin HTTPS acquisition; verify its saved receipt before every cache reuse.

    Receipts protect against stale/corrupt cache bytes, not a malicious local
    operator who replaces both the data and receipt. They are not an upstream
    signed checksum. Existing files without a receipt are never adopted.
    """
    target=(cache/relative).resolve()
    if not target.is_relative_to(cache.resolve()):raise ValueError('Cache path escape')
    prefixes=(f'https://raw.githubusercontent.com/{REPO}/{REVISION}/',
              f'https://github.com/{REPO}/tree/{REVISION}/')
    if not url.startswith(prefixes):raise ValueError('Source URL must identify the pinned HTTPS revision')
    receipt=cache/'.receipts'/(hashlib.sha256(relative.encode()).hexdigest()+'.json')
    if target.exists():
        if not receipt.is_file():raise ValueError('Unverified existing cache; use a new empty cache directory')
        expected=json.loads(receipt.read_text(encoding='utf8'))
        if expected.get('url')!=url or expected.get('source_commit')!=REVISION:
            raise ValueError('Cached source receipt does not match the requested pinned source')
        with target.open('rb') as stream:data=stream.read(limit+1)
        if hashlib.sha256(data).hexdigest()!=expected.get('sha256') or len(data)!=expected.get('bytes'):
            raise ValueError('Cached source integrity mismatch: '+relative)
    else:
        if receipt.exists():raise ValueError('Receipt exists without its source file')
        request=urllib.request.Request(url,headers={'User-Agent':'VowelScope-OpenCorpusPreparation/1.0'})
        with urllib.request.urlopen(request,timeout=30) as stream:data=stream.read(limit+1)
        if len(data)>limit:raise ValueError('Source file exceeds declared size limit')
        target.parent.mkdir(parents=True,exist_ok=True)
        with target.open('xb') as stream:stream.write(data)
        receipt.parent.mkdir(parents=True,exist_ok=True)
        with receipt.open('x',encoding='utf8') as stream:
            json.dump({'url':url,'source_commit':REVISION,'sha256':hashlib.sha256(data).hexdigest(),
                       'bytes':len(data),'verification':'pinned HTTPS acquisition receipt'},stream)
    if len(data)>limit:raise ValueError('Cached file exceeds declared size limit')
    return data


def annotation_files(cache,speaker):
    url=f'https://github.com/{REPO}/tree/{REVISION}/{speaker}/annotation'
    text=cached_get(cache,f'metadata/{speaker}-annotation.html',url,4_000_000).decode('utf8')
    for attrs,body in re.findall(r'<script\b([^>]*)>(.*?)</script>',text,re.S):
        if 'application/json' not in attrs:continue
        try:route=json.loads(body).get('payload',{}).get('codeViewTreeRoute')
        except ValueError:continue
        if not route:continue
        if route.get('refInfo',{}).get('currentOid')!=REVISION:raise ValueError('Unpinned directory listing')
        files=route.get('tree',{}).get('items',[])
        if route.get('tree',{}).get('totalCount')!=len(files):raise ValueError('Truncated directory listing')
        return sorted(item['path'] for item in files if item.get('contentType')=='file'
            and re.fullmatch(re.escape(speaker)+r'/annotation/arctic_[ab]\d{4}\.TextGrid',item['path']))
    raise ValueError('Pinned source directory metadata unavailable')


def prepare(cache,output,files_per_speaker=3):
    cache=outside_checkout(cache,CHECKOUT,'Private corpus cache');cache.mkdir(parents=True,exist_ok=True)
    output=outside_checkout(output,CHECKOUT,'Private review queue')
    if output.parent!=cache or output.exists():raise ValueError('Use a new queue file directly inside the cache directory')
    documents={};hashes={}
    raw=f'https://raw.githubusercontent.com/{REPO}/{REVISION}/'
    # The documented license/version is checked before any recording download.
    for file,expected in DOCUMENT_HASHES.items():
        data=cached_get(cache,file,raw+file,200_000)
        actual=hashlib.sha256(data).hexdigest()
        if actual!=expected:raise ValueError('Pinned corpus document hash mismatch: '+file)
        hashes[file]=actual;documents[file]=data.decode('utf8')
    speakers=re.findall(r'^\|([A-Z]{2,5})\|[MF]\|',documents['README.md'],re.M)
    if len(speakers)!=24 or len(set(speakers))!=24:raise ValueError('Expected documented 24-speaker population')
    rows=[];excluded=Counter();phone_counts=Counter();total_bytes=0;recordings=0
    for number,speaker in enumerate(sorted(speakers),1):
        paths=annotation_files(cache,speaker)
        if len(paths)<files_per_speaker:raise ValueError('Incomplete manual-annotation population')
        for annotation in paths[:files_per_speaker]:
            text=cached_get(cache,annotation,raw+annotation,500_000)
            intervals=parse_phones(text.decode('utf-8-sig'))
            candidates,reasons=candidate_windows(intervals);excluded.update(reasons)
            audio=annotation.replace('/annotation/','/wav/').replace('.TextGrid','.wav')
            data=cached_get(cache,audio,raw+audio,3_000_000)
            total_bytes+=len(data)
            if total_bytes>160_000_000:raise ValueError('Selected recording budget exceeded')
            with wave.open(io.BytesIO(data)) as wav:
                if wav.getcomptype()!='NONE' or wav.getframerate()!=44100 or wav.getnchannels()!=1:
                    raise ValueError('Unexpected documented WAV format')
                duration=wav.getnframes()/wav.getframerate()
            if intervals and intervals[-1][1]>duration+.002:raise ValueError('Annotation exceeds paired recording')
            hashes[annotation]=hashlib.sha256(text).hexdigest();hashes[audio]=hashlib.sha256(data).hexdigest()
            recordings+=1
            for row in candidates:
                row.update(audio_path=audio,speaker_id=speaker,language='en-l2',split='independent_pending_review')
                phone_counts[row['actual_phone']]+=1;rows.append(row)
        print(f'Prepared speaker {number}/24; candidate windows={len(rows)}',flush=True)
    queue={'schema_version':1,'kind':'reference_review_queue','reference_review_status':'pending',
        'source':'L2-ARCTIC v5 documentation, pinned public distribution',
        'source_repository':REPO,'source_commit':REVISION,'license':'CC-BY-NC-4.0',
        'purpose':'Private noncommercial research; attribution required; no source audio committed',
        'preparation_code_sha256':hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),
        'preparation_git_context':git_provenance(CHECKOUT),
        'integrity_method':'Pinned HTTPS revision, fixed documentation hashes, verified acquisition receipts on reuse',
        'selection_protocol':{'manual_files_per_speaker':files_per_speaker,'ordering':'lexicographic before model execution',
            'minimum_vowel_duration_s':.1,'frequency_references':'missing; require blinded review',
            'dsp_predictions_generated':False,'proposed_midpoint_is_final_reference':False},
        'summary':{'speaker_count':len(speakers),'recordings':recordings,'candidate_vowels':len(rows),
            'recording_bytes':total_bytes,'by_actual_phone':dict(phone_counts),'excluded_before_any_prediction':dict(excluded)},
        'file_sha256':hashes,'samples':rows}
    with output.open('x',encoding='utf8') as stream:json.dump(queue,stream,ensure_ascii=False,indent=2)
    return queue['summary']


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--cache',type=Path,required=True)
    parser.add_argument('--out',type=Path,required=True)
    parser.add_argument('--files-per-speaker',type=int,default=3)
    options=parser.parse_args()
    if not 1<=options.files_per_speaker<=10:parser.error('Use 1..10 files per speaker')
    print(json.dumps(prepare(options.cache,options.out,options.files_per_speaker),ensure_ascii=False))


if __name__=='__main__':main()

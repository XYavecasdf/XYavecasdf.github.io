#!/usr/bin/env python3
"""Index English lexical headings, omitting solely rare extra categories."""
import argparse
from datetime import date
import hashlib
import json
from pathlib import Path
import re
from urllib.parse import quote
from import_pronunciation_audio import api

ROOT = Path(__file__).resolve().parents[1]
TAGS = {'Noun':'n','Verb':'v','Adjective':'adj','Adverb':'adv','Proper noun':'prop.n',
        'Pronoun':'pron','Preposition':'prep','Determiner':'det','Conjunction':'conj',
        'Interjection':'interj','Numeral':'num','Participle':'part'}
OLD = re.compile(r'\{\{(?:lb|label|context)\|en\|[^}]*\b(?:obsolete|archaic|rare|dated|nonstandard|humorous)\b|\{\{(?:obsolete|archaic|rare) (?:form|spelling) of\b', re.I)


def extract_pos(text):
    en = re.search(r'^==\s*English\s*==\s*\n(.*?)(?=^==[^=]|\Z)', text, re.M|re.S)
    if not en:
        return [], False
    en = en[1]
    headings = list(re.finditer(r'^(={3,6})\s*([^=\n]+?)\s*\1\s*$', en, re.M))
    current, all_tags = [], []
    for i,h in enumerate(headings):
        tag = TAGS.get(h[2].strip())
        if not tag:
            continue
        end = next((n.start() for n in headings[i+1:] if len(n[1]) <= len(h[1])), len(en))
        senses = re.findall(r'^#\s+(.+)$', en[h.end():end], re.M)
        if not senses:
            continue
        if tag not in all_tags:
            all_tags.append(tag)
        if any(not OLD.search(s) for s in senses) and tag not in current:
            current.append(tag)
    if len(current) > 1 and 'prop.n' in current:
        current.remove('prop.n')
    return current or all_tags, not bool(current)


def refresh(cache):
    path = ROOT/'lexicon.json'
    data = json.loads(path.read_text())
    words = list(data['lexicon'])
    for offset in range(0,len(words),40):
        batch = words[offset:offset+40]
        query = api('en.wiktionary.org',dict(action='query',prop='revisions',rvprop='ids|content',rvslots='main',titles='|'.join(batch),redirects=1),cache)['query']
        aliases={r['from']:r['to'] for k in ['normalized','redirects'] for r in query.get(k,[])}
        pages={r['title']:r for r in query['pages']}
        for word in batch:
            title=word
            for _ in range(5):
                if title not in aliases:break
                title=aliases[title]
            page=pages.get(title,{})
            revision=page.get('revisions',[{}])[0]
            tags,historical=extract_pos(revision.get('slots',{}).get('main',{}).get('content',''))
            if not tags:raise ValueError(f'No sourced English part of speech: {word}')
            entry=data['lexicon'][word]
            entry['parts_of_speech']=tags
            entry['pos_source_url']='https://en.wiktionary.org/w/index.php?title='+quote(title)+'&oldid='+str(revision['revid'])+'#English'
            entry['pos_historical_only']=historical
        print(f'Parts of speech: {min(offset+40,len(words))}/{len(words)}',flush=True)
    payload={w:e['parts_of_speech'] for w,e in data['lexicon'].items()}
    data['metadata']['pos_version']=hashlib.sha256(json.dumps(payload,sort_keys=True).encode()).hexdigest()[:12]
    data['metadata']['parts_of_speech']=dict(source='English Wiktionary lexical headings',checked_on=date.today().isoformat(),words=len(words),
        note='English only; omit additional categories whose senses are all explicitly rare/archaic/obsolete/dated/nonstandard/humorous. Retain the attested category if it is the only one.')
    path.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n')


if __name__=='__main__':
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('--cache',type=Path,required=True)
    args=p.parse_args();args.cache.mkdir(parents=True,exist_ok=True);refresh(args.cache)

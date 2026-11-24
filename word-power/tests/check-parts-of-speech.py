#!/usr/bin/env python3
"""Check sourced POS coverage and English/current-use extraction boundaries."""
import hashlib
import json
from pathlib import Path
import sys
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'tools'))
from import_parts_of_speech import extract_pos,TAGS
data=json.loads((ROOT/'lexicon.json').read_text())
for word,e in data['lexicon'].items():
    tags=e['parts_of_speech']
    assert tags and len(tags)==len(set(tags)),word
    assert set(tags)<=set(TAGS.values()),word
    assert 'oldid=' in e['pos_source_url'] and e['pos_source_url'].endswith('#English'),word
for word,tags in {'egoist':['n'],'proscribe':['v'],'adroit':['adj'],'intimate':['adj','n','v'],'rural':['adj']}.items():
    assert data['lexicon'][word]['parts_of_speech']==tags,word
fixture='==French==\n===Verb===\n# courir\n==English==\n===Noun===\n# A thing.\n===Verb===\n# {{lb|en|obsolete}} To do.\n'
assert extract_pos(fixture)==(['n'],False)
assert extract_pos('==English==\n===Noun===\n# {{lb|en|dated}} A thing.\n')==(['n'],True)
assert extract_pos('==French==\n===Noun===\n# chose\n')==([],False)
payload={w:e['parts_of_speech'] for w,e in data['lexicon'].items()}
assert hashlib.sha256(json.dumps(payload,sort_keys=True).encode()).hexdigest()[:12]==data['metadata']['pos_version']
assert data['metadata']['parts_of_speech']['words']==len(data['lexicon'])
print(f'PASS: sourced POS labels for all {len(data["lexicon"])} entries, language and historical-use boundaries')

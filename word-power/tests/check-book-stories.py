#!/usr/bin/env python3
"""Check the story index and the self-contained offline copy."""
from collections import Counter
import hashlib
import json
from pathlib import Path
import re

root = Path(__file__).resolve().parents[1]
data = json.loads((root / 'lexicon.json').read_text())
html = (root / 'index.html').read_text()
embedded = re.search(r'<script id="word-data" type="application/json">([\s\S]*?)</script>', html)[1]
assert json.loads(embedded) == data, 'Offline data differs from live JSON'
assert len(data['lexicon']) == data['metadata']['unique_words'] == 507
stories = data['book_stories']
expected = data['metadata']['book_stories']
assert len(stories) == expected['summary_count']
attached = {w: x for w, x in data['lexicon'].items() if 'book_story' in x}
assert len(attached) == expected['word_count'] == 8
assert len(stories) == 4
assert hashlib.sha256((root / 'tools/book-stories.tsv').read_bytes()).hexdigest()[:12] == data['metadata']['book_stories_version']
for word, entry in attached.items():
    ref = entry['book_story']
    story = stories[ref['story_id']]
    assert word in story['related_words'], word
    assert len(story['summary']) >= 30, word
    assert set(ref['mention_pages']) <= set(story['source_pages']), word
    assert all(1 <= p <= expected['pdf_pages'] for p in story['source_pages']), word
    assert ref['kind'] == 'narrative', word
    assert story['historical_status'] in {'historical', 'legend'}, word
    assert story['historical_sources'], word
    assert not re.search('作者|书中|本书|读者|记忆方法', story['summary']), word
    assert all(w in data['lexicon'] for w in story['related_words']), word
assert dict(Counter(x['book_story']['kind'] for x in attached.values())) == expected['kinds']
for word in ['anonymous', 'bilingual', 'posthumous', 'diaphanous', 'sycophant',
             'describe', 'prescribe', 'manuscript', 'omnipresent']:
    assert 'book_story' not in data['lexicon'][word], word
assert data['lexicon']['laconic']['book_story']['kind'] == 'narrative'
assert 317 in stories[data['lexicon']['laconic']['book_story']['story_id']]['source_pages']
for word in ['laconic', 'omnipotent']:
    assert stories[attached[word]['book_story']['story_id']]['historical_status'] == 'legend'
print(f'PASS: {len(data["lexicon"])} entries, {len(stories)} historical stories on {len(attached)} entries, source ranges and offline parity')

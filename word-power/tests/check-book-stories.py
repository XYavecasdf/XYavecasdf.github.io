#!/usr/bin/env python3
"""Check multi-story coverage, editorial source parity and provenance contracts."""
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
additions = json.loads((root / 'tools/story-word-additions.json').read_text())
assert len(data['lexicon']) == data['metadata']['unique_words'] == 507 + len(additions)
stories, expected = data['book_stories'], data['metadata']['book_stories']
assert expected['schema_version'] == 2
assert len(stories) == expected['summary_count'] == 30
attached = {w: x for w, x in data['lexicon'].items() if x.get('book_stories')}
assert len(attached) == expected['word_count'] == 33
assert hashlib.sha256((root / 'tools/book-stories.tsv').read_bytes()).hexdigest()[:12] == data['metadata']['book_stories_version']
references = []
for word, entry in data['lexicon'].items():
    assert 'book_story' not in entry, word
    refs = entry.get('book_stories', [])
    assert len({r['story_id'] for r in refs}) == len(refs), word
    for ref in refs:
        story = stories[ref['story_id']]
        references.append(ref)
        assert word in story['related_words'], word
        assert len(story['summary']) >= 30, word
        assert set(ref['mention_pages']) <= set(story['source_pages']), word
        assert all(1 <= p <= expected['pdf_pages'] for p in story['source_pages']), word
        assert ref['kind'] == 'narrative', word
        assert story['historical_status'] in {'historical', 'legend', 'reported', 'disputed'}, word
        assert story['historical_sources'], word
        assert not re.search('作者|书中|本书|读者|记忆方法', story['summary']), word
        assert all(w in data['lexicon'] for w in story['related_words']), word
assert len(references) == expected['reference_count'] == 37
assert dict(Counter(r['kind'] for r in references)) == expected['kinds']
for word in ['anonymous', 'bilingual', 'posthumous', 'diaphanous', 'describe', 'prescribe', 'manuscript', 'omnipresent']:
    assert not data['lexicon'][word].get('book_stories'), word
refs = data['lexicon']['laconic']['book_stories']
assert len(refs) == 3
assert {p for r in refs for p in r['mention_pages']} >= {301, 317}
for word in ['laconism', 'laconicism']:
    assert len(data['lexicon'][word]['book_stories']) == 2
for word in ['taciturn', 'sycophant', 'genocide', 'regicide', *[x['word'] for x in additions]]:
    assert data['lexicon'][word].get('book_stories'), word
assert stories[data['lexicon']['sycophant']['book_stories'][0]['story_id']]['historical_status'] == 'disputed'
assert '用法提醒' in stories[data['lexicon']['regicide']['book_stories'][0]['story_id']]['editorial_note']
print(f'PASS: {len(data["lexicon"])} entries, 30 stories / 33 words / 37 references, multi-story and offline parity')

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
assert len(data['lexicon']) == expected['word_count']
assert hashlib.sha256((root / 'tools/book-stories.tsv').read_bytes()).hexdigest()[:12] == data['metadata']['book_stories_version']
for word, entry in data['lexicon'].items():
    ref = entry['book_story']
    story = stories[ref['story_id']]
    assert word in story['related_words'], word
    assert len(story['summary']) >= 30, word
    assert set(ref['mention_pages']) <= set(story['source_pages']), word
    assert all(1 <= p <= expected['pdf_pages'] for p in story['source_pages']), word
    assert ref['kind'] in {'explanation', 'narrative', 'context', 'exercise'}, word
    assert all(w in data['lexicon'] for w in story['related_words']), word
assert dict(Counter(x['book_story']['kind'] for x in data['lexicon'].values())) == expected['kinds']
assert data['lexicon']['anonymous']['book_story']['kind'] == 'context'
assert data['lexicon']['laconic']['book_story']['kind'] == 'narrative'
assert data['lexicon']['bilingual']['book_story']['kind'] == 'exercise'
assert 317 in stories[data['lexicon']['laconic']['book_story']['story_id']]['source_pages']
assert data['lexicon']['posthumous']['book_story']['mention_pages'] == [21]
print(f'PASS: {len(data["lexicon"])} entries, {len(stories)} summaries, source ranges and offline parity')

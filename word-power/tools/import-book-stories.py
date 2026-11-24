#!/usr/bin/env python3
"""Attach curated historical anecdotes without publishing the source PDF.

Usage: python tools/import-book-stories.py /path/to/source.pdf
Requires pdftotext. Page numbers are physical, one-based PDF page numbers.
Editorial source: book-stories.tsv (words, pages, title, narrative, status,
reference label, reference URL). Entries without a historical anecdote have
no book_story field. Never fill gaps with explanations or invented scenes.
"""
import argparse
from collections import Counter
import hashlib
import json
from pathlib import Path
import re
import subprocess

ROOT = Path(__file__).resolve().parents[1]

def page_range(text):
    pages = []
    for item in text.split(','):
        ends = [int(v) for v in item.split('-')]
        pages.extend(range(ends[0], ends[-1] + 1))
    return sorted(set(pages))

def attach(pdf):
    data = json.loads((ROOT / 'lexicon.json').read_text())
    raw = subprocess.check_output(['pdftotext', '-layout', str(pdf), '-']).decode('utf-8')
    pages = raw.split('\f')
    if not pages[-1].strip():
        pages.pop()
    editorial = (ROOT / 'tools/book-stories.tsv').read_text()
    for entry in data['lexicon'].values():
        entry.pop('book_story', None)
    stories, assigned = {}, set()
    for number, line in enumerate(editorial.splitlines(), 1):
        words, source, title, summary, status, label, url = line.split('\t')
        words, source = words.split('|'), page_range(source)
        assert all(1 <= p <= len(pages) for p in source), (number, source)
        sid = f'history-{number:03d}'
        assert status in {'historical', 'legend'}, status
        stories[sid] = dict(title=title, summary=summary, source_pages=source,
                            related_words=words, historical_status=status,
                            historical_sources=[dict(label=label, url=url)])
        for word in words:
            assert word in data['lexicon'] and word not in assigned, word
            assigned.add(word)
            pattern = re.compile(r'(?<![A-Za-z])' + re.escape(word) + r'(?![A-Za-z])', re.I)
            evidence = [p for p in source if pattern.search(pages[p-1])]
            assert evidence, f'{word}: no literal occurrence on source pages'
            data['lexicon'][word]['book_story'] = dict(story_id=sid, kind='narrative', mention_pages=evidence)
    data['book_stories'] = stories
    version = hashlib.sha256(editorial.encode()).hexdigest()[:12]
    data['metadata']['book_stories_version'] = version
    data['metadata']['book_stories'] = dict(
        source_title='Word Power Made Easy', author='Norman Lewis', pdf_pages=len(pages),
        source_sha256=hashlib.sha256(pdf.read_bytes()).hexdigest(),
        page_basis='Physical PDF page, one-based; uploaded edition, not print page numbers.',
        date='2026-11-24', word_count=len(assigned), summary_count=len(stories),
        kinds=dict(Counter(x['book_story']['kind'] for x in data['lexicon'].values() if 'book_story' in x)),
        note='仅保留直接相关的历史故事；传说单独标明。没有历史典故的词条不显示故事区。')
    encoded = json.dumps(data, ensure_ascii=False, indent=2) + '\n'
    (ROOT / 'lexicon.json').write_text(encoded)
    html = (ROOT / 'index.html').read_text()
    pattern = r'(<script id="word-data" type="application/json">)[\s\S]*?(</script>)'
    # Escape script terminators in embedded data, while preserving the external JSON.
    embedded = encoded.rstrip().replace('<', '\\u003c')
    html, count = re.subn(pattern, lambda m: m[1] + embedded + m[2], html, count=1)
    assert count == 1
    (ROOT / 'index.html').write_text(html)
    print(json.dumps(data['metadata']['book_stories'], ensure_ascii=False, indent=2))

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('pdf', type=Path)
    attach(parser.parse_args().pdf)

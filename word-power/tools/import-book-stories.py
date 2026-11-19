#!/usr/bin/env python3
"""Attach reviewed Chinese book summaries without publishing the source PDF.

Usage: python tools/import-book-stories.py /path/to/source.pdf
Requires pdftotext. Page numbers are physical, one-based PDF page numbers.
Editorial source: book-stories.tsv (word keys, page ranges, title, summary).
"""
import argparse
from collections import Counter
import hashlib
import json
from pathlib import Path
import re
import subprocess

ROOT = Path(__file__).resolve().parents[1]
CONTEXT = set('anonymous compunction concur confidence operation vocabulary virile assimilate consequence posthumous infant reverse dissection exuberant kindness physician appendicitis similarity dissimilar'.split())
EXERCISE = set('anthropoid anthropomorphic anthropophobia democracy egomania bilingual bibliomania sophisticated international universe survive symphony telescope monarchy'.split())
NARRATIVE = set('laconic laconism laconicism proscribe prescribe describe script manuscript postscript sycophant diaphanous stoic stoical stoicism omnipotent omnipresent'.split())

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
    stories, assigned = {}, set()
    for number, line in enumerate(editorial.splitlines(), 1):
        words, source, title, summary = line.split('\t')
        words, source = words.split('|'), page_range(source)
        assert all(1 <= p <= len(pages) for p in source), (number, source)
        sid = f'book-{number:03d}'
        stories[sid] = dict(title=title, summary=summary, source_pages=source, related_words=words)
        for word in words:
            assert word in data['lexicon'] and word not in assigned, word
            assigned.add(word)
            pattern = re.compile(r'(?<![A-Za-z])' + re.escape(word) + r'(?![A-Za-z])', re.I)
            evidence = [p for p in source if pattern.search(pages[p-1])]
            assert evidence, f'{word}: no literal occurrence on source pages'
            kind = 'context' if word in CONTEXT else 'exercise' if word in EXERCISE else 'narrative' if word in NARRATIVE else 'explanation'
            data['lexicon'][word]['book_story'] = dict(story_id=sid, kind=kind, mention_pages=evidence)
    assert assigned == set(data['lexicon']), sorted(set(data['lexicon']) - assigned)
    data['book_stories'] = stories
    version = hashlib.sha256(editorial.encode()).hexdigest()[:12]
    data['metadata']['book_stories_version'] = version
    data['metadata']['book_stories'] = dict(
        source_title='Word Power Made Easy', author='Norman Lewis', pdf_pages=len(pages),
        source_sha256=hashlib.sha256(pdf.read_bytes()).hexdigest(),
        page_basis='Physical PDF page, one-based; uploaded edition, not print page numbers.',
        date='2026-11-19', word_count=len(assigned), summary_count=len(stories),
        kinds=dict(Counter(x['book_story']['kind'] for x in data['lexicon'].values())),
        note='中文整理；同词族可共享原书讲解。单独标记故事、词源讲解、构词练习与书中用例。未公开上传原书。')
    # These links substantiate editorial corrections, separately from the book.
    for word, label, url in [
        ('alma mater', 'American Heritage · alma mater', 'https://www.ahdictionary.com/word/search.html?q=alma+mater'),
        ('sycophant', 'Etymonline · sycophant', 'https://www.etymonline.com/word/sycophant')]:
        data['lexicon'][word]['book_story']['editorial_sources'] = [dict(label=label, url=url)]
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

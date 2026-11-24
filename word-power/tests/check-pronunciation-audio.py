#!/usr/bin/env python3
"""Validate audio provenance, coverage, embedded parity and language extraction."""
import hashlib
import importlib.util
import json
from pathlib import Path
import re
from urllib.parse import urlsplit

ROOT = Path(__file__).resolve().parents[1]
data = json.loads((ROOT / 'lexicon.json').read_text())
html = (ROOT / 'index.html').read_text()
embedded = json.loads(re.search(r'<script id="word-data" type="application/json">(.*?)</script>', html, re.S)[1])
assert embedded == data
spec = importlib.util.spec_from_file_location('import_audio', ROOT / 'tools/import_pronunciation_audio.py')
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
assert module.extract_audio('==French==\n{{audio|fr|fr-test.ogg}}\n') == []
fixture = ('==English==\n{{audio|en|En-us-test.ogg|a=US}}\n'
           '{{audio|fr|fr-test.ogg}}\n==Spanish==\n{{audio|en|Wrong-section.ogg}}\n')
assert module.extract_audio(fixture) == [{'filename': 'En-us-test.ogg', 'accent': 'US'}]
assert module.extract_audio('==English==\n{{audio|en|Not-an-audio-file.html}}\n') == []

recorded, clips = 0, 0
for word, entry in data['lexicon'].items():
    samples = entry['pronunciation_audio']
    assert isinstance(samples, list) and len(samples) <= 2, word
    recorded += bool(samples)
    clips += len(samples)
    for sample in samples:
        for field in ['url', 'file_url', 'artist', 'license', 'accent']:
            assert isinstance(sample[field], str) and sample[field], (word, field)
        assert urlsplit(sample['url']).scheme == 'https'
        assert urlsplit(sample['url']).netloc == 'upload.wikimedia.org'
        assert urlsplit(sample['file_url']).netloc == 'commons.wikimedia.org'
        assert not urlsplit(sample['url']).query
        if sample['license_url']:
            assert urlsplit(sample['license_url']).netloc == 'creativecommons.org'
        assert '<' not in sample['artist'], word
meta = data['metadata']['pronunciation_audio']
assert meta['recorded_words'] == recorded
assert meta['total_words'] == len(data['lexicon']) == 507
serialized = json.dumps({w: x['pronunciation_audio'] for w, x in data['lexicon'].items()}, sort_keys=True)
assert hashlib.sha256(serialized.encode()).hexdigest()[:12] == data['metadata']['pronunciation_audio_version']
print(f'PASS: {recorded}/507 words with {clips} attributed recordings; English-only import and embedded parity')

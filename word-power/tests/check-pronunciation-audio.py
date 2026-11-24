#!/usr/bin/env python3
"""Validate audio provenance, coverage, embedded parity and language extraction."""
import hashlib
import importlib.util
import json
from pathlib import Path
import re
import sys
from urllib.parse import urlsplit

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'tools'))
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
from american_pronunciation import is_american
for accent in ['US', 'GA', 'California', 'General American', 'New Jersey']:
    assert is_american(accent)
for accent in ['UK', 'AU', 'Canada', 'CA', 'English', 'Southern England']:
    assert not is_american(accent)

recorded, clips, us_recorded, us_synthetic = 0, 0, 0, 0
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
    us = entry['american_pronunciation']
    assert us['locale'] == 'en-US', word
    if us['kind'] == 'recording':
        assert is_american(samples[us['recording_index']]['accent']), word
        us_recorded += 1
    else:
        assert us['kind'] == 'synthetic' and us['voice'] == 'cmu_us_slt', word
        assert us['url'].startswith('./audio/en-US/') and '..' not in us['url'][2:], word
        asset = ROOT / us['url'][2:]
        assert asset.stat().st_size > 500, word
        assert hashlib.sha256(asset.read_bytes()).hexdigest() == us['sha256'], word
        us_synthetic += 1
meta = data['metadata']['pronunciation_audio']
assert meta['recorded_words'] == recorded
assert meta['total_words'] == len(data['lexicon']) == 507
assert meta['american_recorded_words'] == us_recorded
assert meta['american_synthetic_words'] == us_synthetic
assert meta['american_total_words'] == us_recorded + us_synthetic == 507
serialized = json.dumps({w: dict(recordings=x['pronunciation_audio'], american=x['american_pronunciation']) for w, x in data['lexicon'].items()}, sort_keys=True)
assert hashlib.sha256(serialized.encode()).hexdigest()[:12] == data['metadata']['pronunciation_audio_version']
print(f'PASS: {recorded}/507 recorded; US coverage {us_recorded} human + {us_synthetic} synthetic = 507; asset hashes, language extraction and embedded parity')

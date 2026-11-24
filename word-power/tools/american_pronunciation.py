#!/usr/bin/env python3
"""Ensure every word has an en-US recording or a shipped US synthetic MP3.

Requires FFmpeg with the CMU Flite US SLT voice and libmp3lame. Other English
accents are never used as a substitute for an American pronunciation.
"""
import hashlib
import json
from pathlib import Path
import subprocess
import tempfile

ROOT = Path(__file__).resolve().parents[1]
US_ACCENTS = {
    'US', 'GA', 'GenAm', 'General American', 'United States', 'California',
    'Texas', 'Southern California', 'Mid-Atlantic US', 'Connecticut',
    'New Jersey', 'Midwestern US', 'Northern California', 'Maryland',
    'New Mexico', 'Southern California with California Vowel Shift',
}


def is_american(accent):
    return any(part.strip() in US_ACCENTS for part in accent.split(','))


def update_version(data):
    payload = {w: dict(recordings=e['pronunciation_audio'], american=e['american_pronunciation'])
               for w, e in data['lexicon'].items()}
    serialized = json.dumps(payload, sort_keys=True)
    data['metadata']['pronunciation_audio_version'] = hashlib.sha256(serialized.encode()).hexdigest()[:12]


def ensure_american(data, root=ROOT):
    destination = root / 'audio/en-US'
    destination.mkdir(parents=True, exist_ok=True)
    recorded, generated = 0, 0
    with tempfile.TemporaryDirectory(prefix='word-power-us-') as tmp:
        text = Path(tmp) / 'word.txt'
        for word, entry in data['lexicon'].items():
            index = next((i for i, sample in enumerate(entry['pronunciation_audio'])
                          if is_american(sample['accent'])), None)
            if index is not None:
                entry['american_pronunciation'] = dict(kind='recording', locale='en-US', recording_index=index)
                recorded += 1
                continue
            name = hashlib.sha256(('cmu_us_slt-v1:' + word).encode()).hexdigest()[:16] + '.mp3'
            output = destination / name
            if not output.exists():
                text.write_text(word)
                subprocess.run(['ffmpeg', '-hide_banner', '-loglevel', 'error', '-y',
                                '-f', 'lavfi', '-i', f'flite=textfile={text}:voice=slt',
                                '-af', 'apad=pad_dur=0.12', '-ar', '22050', '-ac', '1',
                                '-c:a', 'libmp3lame', '-q:a', '5', '-map_metadata', '-1', str(output)],
                               check=True, timeout=25)
            assert output.stat().st_size > 500, word
            entry['american_pronunciation'] = dict(
                kind='synthetic', locale='en-US', url='./audio/en-US/' + name,
                engine='CMU Flite', voice='cmu_us_slt',
                sha256=hashlib.sha256(output.read_bytes()).hexdigest())
            generated += 1
            if generated % 40 == 0:
                print(f'US synthetic audio: {generated}', flush=True)
    data['metadata']['pronunciation_audio'].update(
        source='English Wiktionary / Wikimedia Commons; CMU Flite US SLT',
        american_recorded_words=recorded, american_synthetic_words=generated,
        american_total_words=recorded + generated,
        fallback='Browser en-US speech synthesis only',
        note='Every word has a primary US option: an explicitly US-labelled Commons recording or a shipped CMU Flite US SLT synthetic MP3. Other accents remain additional options.')
    update_version(data)
    print(f'American coverage: {recorded} recorded + {generated} synthetic = {recorded + generated}', flush=True)


if __name__ == '__main__':
    path = ROOT / 'lexicon.json'
    data = json.loads(path.read_text())
    ensure_american(data)
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n')

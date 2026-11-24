#!/usr/bin/env python3
"""Index English Wiktionary recordings and Commons attribution, without audio copies.

Uses anonymous MediaWiki API batches, retries and an external response cache.
Only explicit {{audio|en|...}} templates in the English section are eligible.
No guessed filenames or dictionary-page scraping is used during playback.
"""
import argparse
from datetime import date
import hashlib
from html import unescape
import json
from pathlib import Path
import re
import time
from urllib.parse import urlencode, urlsplit, urlunsplit
from urllib.request import Request, urlopen
from american_pronunciation import ensure_american, is_american

ROOT = Path(__file__).resolve().parents[1]
AGENT = 'WordPowerPronunciation/1.0 (https://github.com/XYavecasdf/word-power; educational audio index)'


def plain(value):
    return re.sub(r'\s+', ' ', unescape(re.sub(r'<[^>]*>', ' ', value))).strip()


def api(host, params, cache):
    params = dict(params, format='json', formatversion=2, maxlag=5)
    url = f'https://{host}/w/api.php?' + urlencode(params)
    path = cache / (hashlib.sha256(url.encode()).hexdigest() + '.json')
    if path.exists():
        return json.loads(path.read_text())
    for attempt in range(4):
        try:
            with urlopen(Request(url, headers={'User-Agent': AGENT}), timeout=35) as response:
                result = json.load(response)
            if 'error' in result:
                raise ValueError(result['error'])
            path.write_text(json.dumps(result))
            time.sleep(0.15)
            return result
        except Exception:
            if attempt == 3:
                raise
            time.sleep(2 ** attempt)


def extract_audio(text):
    match = re.search(r'^==\s*English\s*==\s*\n(.*?)(?=^==[^=]|\Z)', text, re.M | re.S)
    if not match:
        return []
    found = []
    for match in re.finditer(r'\{\{audio\|en\|([^{}]+)\}\}', match[1], re.I):
        parts = match[1].split('|')
        filename = parts[0].strip().replace('_', ' ')
        if not re.search(r'\.(ogg|oga|wav|mp3|flac)$', filename, re.I):
            continue
        # A pronunciation intended for another word is not a usable recording.
        if any(p.strip().startswith('text=') for p in parts[1:]):
            continue
        accent = next((p.split('=', 1)[1].strip() for p in parts[1:] if p.strip().startswith('a=')), '')
        if not accent:
            accent = next((p.strip() for p in parts[1:] if '=' not in p and p.strip()), 'English')
        if '{{' in accent or '<<' in accent:
            accent = 'English'
        if filename not in [x['filename'] for x in found]:
            found.append(dict(filename=filename, accent=accent))
    # Prefer an explicitly labelled US and UK sample, with at most two recordings.
    rank = lambda x: (0 if is_american(x['accent']) else
                      1 if x['accent'] in {'UK', 'RP', 'Received Pronunciation', 'Southern England'} else 2)
    return sorted(found, key=rank)[:2]


def file_key(title):
    title = title.removeprefix('File:').replace('_', ' ')
    return title[:1].upper() + title[1:]


def import_audio(cache):
    data = json.loads((ROOT / 'lexicon.json').read_text())
    words = list(data['lexicon'])
    candidates = {}
    for offset in range(0, len(words), 40):
        batch = words[offset:offset + 40]
        result = api('en.wiktionary.org', dict(action='query', prop='revisions',
                     rvprop='content', rvslots='main', titles='|'.join(batch), redirects=1), cache)
        query = result.get('query', {})
        aliases = {x['from']: x['to'] for k in ['normalized', 'redirects'] for x in query.get(k, [])}
        pages = {x['title']: x for x in query.get('pages', [])}
        for word in batch:
            title = word
            for _ in range(5):
                if title not in aliases:
                    break
                title = aliases[title]
            page = pages.get(title, {})
            text = page.get('revisions', [{}])[0].get('slots', {}).get('main', {}).get('content', '')
            candidates[word] = extract_audio(text)
        print(f'Wiktionary: {min(offset + 40, len(words))}/{len(words)}', flush=True)

    filenames = sorted({x['filename'] for samples in candidates.values() for x in samples})
    files = {}
    for offset in range(0, len(filenames), 40):
        result = api('commons.wikimedia.org', dict(action='query', prop='imageinfo',
                     iiprop='url|extmetadata', titles='|'.join('File:' + f for f in filenames[offset:offset + 40])), cache)
        for page in result.get('query', {}).get('pages', []):
            info = page.get('imageinfo', [{}])[0]
            meta = info.get('extmetadata', {})
            val = lambda k: plain(str(meta.get(k, {}).get('value', '')))
            artist = val('Artist')
            if not artist:
                match = re.search(r'recorded by\s+(.+)', val('ImageDescription'), re.I)
                artist = match[1].rstrip('.') if match else ''
            license_name, license_url = val('LicenseShortName'), val('LicenseUrl')
            public_domain = 'public domain' in license_name.lower() or 'cc0' in license_name.lower()
            if not (info.get('url') and license_name and (artist or public_domain)):
                continue
            if not (public_domain or license_url.startswith(('http://creativecommons.org/', 'https://creativecommons.org/'))):
                continue
            url = urlsplit(info['url'])
            files[file_key(page['title'])] = dict(
                url=urlunsplit((url.scheme, url.netloc, url.path, '', '')),
                file_url=info['descriptionurl'], artist=artist or 'Public domain',
                license=license_name, license_url=license_url.replace('http://', 'https://', 1))
        print(f'Commons: {min(offset + 40, len(filenames))}/{len(filenames)}', flush=True)

    attached = 0
    for word, entry in data['lexicon'].items():
        recordings = [dict(files[file_key(s['filename'])], accent=s['accent'])
                      for s in candidates[word] if file_key(s['filename']) in files]
        entry['pronunciation_audio'] = recordings
        attached += bool(recordings)
    data['metadata']['pronunciation_audio'] = dict(
        source='English Wiktionary / Wikimedia Commons', checked_on=date.today().isoformat(),
        recorded_words=attached, total_words=len(words), fallback='Browser English speech synthesis',
        note='Recordings linked from English audio templates; per-file credits retained. No audio modifications.')
    ensure_american(data)
    (ROOT / 'lexicon.json').write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n')
    print(json.dumps(data['metadata']['pronunciation_audio'], indent=2))


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--cache', type=Path, required=True, help='Response cache outside the public checkout')
    args = parser.parse_args()
    args.cache.mkdir(parents=True, exist_ok=True)
    import_audio(args.cache)

#!/usr/bin/env python3
"""Reconcile the curated story vocabulary without replacing baseline records."""
from collections import Counter
import json
from pathlib import Path
from urllib.parse import quote

ROOT = Path(__file__).resolve().parents[1]


def main():
    path = ROOT / 'lexicon.json'
    data = json.loads(path.read_text())
    additions = json.loads((ROOT / 'tools/story-word-additions.json').read_text())
    audit_path = ROOT / 'audit.json'
    audit = json.loads(audit_path.read_text())
    audit['records'] = [r for r in audit['records'] if r['word'] not in {x['word'] for x in additions}]
    group = next((g for g in data['groups'] if g.get('id') == 'people-places'), None)
    if group is None:
        group = dict(id='people-places', name='人物·地名·典故', roots=[])
        data['groups'].append(group)
    for row in additions:
        word, kind = row['word'], row['origin_kind']
        url = 'https://en.wiktionary.org/wiki/' + quote(word.replace(' ', '_'))
        root = dict(term=row['origin'], zh=row['origin_zh'], lang=kind)
        if kind in {'人名', '地名'}:
            node = next((r for r in group['roots'] if r['term'] == row['origin']), None)
            if node is None:
                node = dict(**root, meaning=row['origin_zh'], original=row['origin'], book_page=row['pages'][0], words=[])
                group['roots'].append(node)
        else:
            node = next(r for g in data['groups'] for r in g['roots'] if r['term'] == '-cide')
        if word not in node['words']:
            node['words'].append(word)
        source = 'Wiktionary IPA（2026-11-24；按原记录规范字形及音节分隔）'
        if word == 'marcel':
            source = 'Wiktionary IPA（展开可选的卷舌音，供美式读音参考）'
        if word == 'parricide':
            source = 'Wiktionary IPA（英式记录；另提供美音音频）'
        if word == 'bloomers':
            source = '根据 bloomer 的词典读音与规则复数推定的近似美式 IPA，待独立核验'
        if word == 'chauvinist':
            source = 'Wiktionary enPR 发音重拼转换的近似美式 IPA，待独立核验'
        entry = data['lexicon'].setdefault(word, {})
        entry.update(word=word, zh=row['zh'], ipa=row['ipa'], ipa_source=source, components=[],
                     component_status='专名衍生词；不把人名、地名当作可自由拼接的词根。' if kind in {'人名', '地名'} else '历史借入词；parri- 的来源有争议，不作强制拆分。',
                     roots=[root], book_pages=row['pages'], wiktionary_url=url, ipa_url=url,
                     source_status='2026-11-24 原书故事词条补录；词典音标与词源资料另列。',
                     origin_kind=kind, origin_note=None)
        if word == 'guppy':
            entry['aliases'] = ['guppies']
        if row.get('source_forms'):
            entry['source_forms'] = row['source_forms']
            entry['aliases'] = row['source_forms']
        if word == 'parricide':
            entry['ipa_accent'] = 'UK'
        entry.setdefault('pronunciation_audio', [])
        audit['records'].append(dict(
            word=word, ipa=entry['ipa'], ipa_source=source, ipa_source_url=url, ipa_status=row['ipa_status'],
            ipa_sources=[url], morphological_analysis=[], morphology_status='NOT_APPLICABLE',
            historical_etymology=row['origin_zh'], etymology_sources=[url], etymology_status='PLAUSIBLE_BUT_UNVERIFIED',
            chinese_definition=row['zh'], chinese_status='PLAUSIBLE_BUT_UNVERIFIED',
            verification_status='PARTIALLY_VERIFIED', confidence='medium',
            issues=['Chinese gloss is editorial; named origins are not productive morphemes.',
                    'Historical anecdotes and disputed origins have separate story-level notes.'] +
                   (['IPA is an approximation, not an independently verified US dictionary transcription.'] if row['ipa_status'] != 'VERIFIED' else []),
            changes_made=['Added from the uploaded book; supplement dated 2026-11-24.'],
            checked_on='2026-11-24', book_pages=row['pages']))
    terms = [r['term'] for g in data['groups'] for r in g['roots']]
    data['metadata'].update(unique_words=len(data['lexicon']), roots=len(set(terms)),
                            word_instances=sum(len(r['words']) for g in data['groups'] for r in g['roots']))
    audit['metadata']['total_entries'] = len(audit['records'])
    audit['metadata']['supplement'] = dict(date='2026-11-24', base_audit_entries=507, added_story_words=len(additions),
                                          note='The baseline audit is retained; supplement records are separately dated.')
    summary = audit['metadata']['summary']
    summary['total'] = len(audit['records'])
    for key, field in [('ipa', 'ipa_status'), ('etymology', 'etymology_status'), ('overall', 'verification_status')]:
        for status, count in Counter(r[field] for r in audit['records']).items():
            summary[f'{key}_{status}'] = count
    summary['verified_ipa'] = sum(r['ipa_status'] in {'VERIFIED', 'CORRECTED'} for r in audit['records'])
    summary['verified_etymology'] = sum(r['etymology_status'] == 'VERIFIED' for r in audit['records'])
    summary['ipa_sources'] = sum(bool(r['ipa_sources']) for r in audit['records'])
    summary['entries_changed'] = sum(bool(r['changes_made']) for r in audit['records'])
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n')
    audit_path.write_text(json.dumps(audit, ensure_ascii=False, indent=2) + '\n')
    print(f'Reconciled {len(additions)} story words; {len(data["lexicon"])} entries in {len(data["groups"])} groups.')


if __name__ == '__main__':
    main()

"""Export private blank references; import a complete blinded human review.

This tool checks provenance/completeness, not reviewer expertise or truthfulness.
It does not listen to recordings, estimate formants or run VowelScope predictions.
"""
import argparse
import csv
import hashlib
import json
import math
from pathlib import Path

from corpus_source import git_provenance, outside_checkout

CHECKOUT = Path(__file__).resolve().parents[2]
IDENTITY = ('audio_path', 'speaker_id', 'language', 'actual_phone',
            'annotation_warning', 'start_s', 'end_s', 'proposed_reference_time_s')
IMMUTABLE = ('token_id', 'queue_sha256', 'plan_sha256') + IDENTITY
MEASUREMENTS = ('gt_time_s', 'gt_f1_hz', 'gt_f2_hz',
                'uncertainty_f1_hz', 'uncertainty_f2_hz')
REVIEW = ('decision',) + MEASUREMENTS + (
    'reviewer', 'method', 'evidence', 'adjudication', 'exclusion_reason')
FIELDS = IMMUTABLE + REVIEW
EXCLUSIONS = ('unresolvable_formants', 'unusable_recording', 'incorrect_phone_interval')


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def read_json(path):
    return json.loads(path.read_text(encoding='utf8'))


def write_json(path, data):
    with path.open('x', encoding='utf8') as stream:
        json.dump(data, stream, ensure_ascii=False, indent=2)
        stream.write('\n')


def load_inputs(queue_path, plan_path):
    queue_path = outside_checkout(queue_path, CHECKOUT, 'Private queue')
    plan_path = outside_checkout(plan_path, CHECKOUT, 'Evaluation plan')
    queue, plan = read_json(queue_path), read_json(plan_path)
    queue_hash, plan_hash = digest(queue_path), digest(plan_path)
    if plan.get('independent', {}).get('queue_sha256') != queue_hash:
        raise ValueError('Frozen plan queue digest mismatch')
    if (queue.get('kind') != 'reference_review_queue' or
            queue.get('reference_review_status') != 'pending' or
            queue.get('selection_protocol', {}).get('dsp_predictions_generated') is not False):
        raise ValueError('Expected an original unscored pending queue')
    hashes = queue.get('file_sha256', {})
    if not hashes or not queue.get('samples'):
        raise ValueError('Source hashes and candidate rows are required')
    for relative, expected in hashes.items():
        unresolved = queue_path.parent / relative
        source = unresolved.resolve()
        if Path(relative).is_absolute() or not source.is_relative_to(queue_path.parent):
            raise ValueError('Source path escape')
        # Matching bytes alone cannot establish that the original source paths
        # have remained regular files. Inspect components before resolve erases
        # leaf/ancestor link identity, including links staying inside the cache.
        if any(part.is_symlink() for part in (unresolved, *unresolved.parents)
               if part != queue_path.parent and part.is_relative_to(queue_path.parent)):
            raise ValueError('Source symlink replacement is not allowed')
        if digest(source) != expected:
            raise ValueError('Source integrity mismatch')
    expected_rows = {}
    for sample in queue['samples']:
        if (sample.get('reference_review_status') != 'pending' or
                any(sample.get(key) is not None for key in MEASUREMENTS[:3])):
            raise ValueError('Queue already contains reference decisions')
        if sample['audio_path'] not in hashes:
            raise ValueError('Unverified candidate audio')
        identity = {key: sample[key] for key in IDENTITY}
        token_id = hashlib.sha256(json.dumps(identity, sort_keys=True,
            separators=(',', ':')).encode('utf8')).hexdigest()
        if token_id in expected_rows:
            raise ValueError('Duplicate source candidate')
        row = {key: str(value) for key, value in identity.items()}
        row.update(token_id=token_id, queue_sha256=queue_hash, plan_sha256=plan_hash)
        expected_rows[token_id] = (row, sample)
    return queue_path, queue, plan, queue_hash, plan_hash, expected_rows


def export_packet(queue, plan, output_dir):
    queue_path, source, frozen, queue_hash, plan_hash, rows = load_inputs(queue, plan)
    output_dir = outside_checkout(output_dir, CHECKOUT, 'Private review packet')
    # No overwrite, including partial packets from an interrupted export.
    output_dir.mkdir(parents=True, exist_ok=False)
    with (output_dir / 'reviews.csv').open('x', newline='', encoding='utf8') as stream:
        writer = csv.DictWriter(stream, fieldnames=FIELDS)
        writer.writeheader()
        for identity, _ in rows.values():
            writer.writerow(dict(identity, decision='pending'))
    attestation = dict(queue_sha256=queue_hash, plan_sha256=plan_hash, custodian='',
        previously_unused_speakers_confirmed=False, blinded_reference_review=False,
        no_predictions_generated=False, review_protocol_evidence='')
    write_json(output_dir / 'attestation.json', attestation)
    summary = dict(candidate_count=len(rows),
        speaker_count=len({sample['speaker_id'] for _, sample in rows.values()}),
        reviewed_references=0, predictions_generated=False)
    write_json(output_dir / 'packet.json', dict(kind='private_reference_review_packet',
        queue_path=str(queue_path), queue_sha256=queue_hash, plan_sha256=plan_hash,
        frozen_evaluation_plan=frozen, source_commit=source.get('source_commit'),
        export_code_sha256=digest(Path(__file__)),
        export_git_context=git_provenance(CHECKOUT), summary=summary))
    guide = f"""# Private blinded reference review

No acoustic predictions or reference frequencies were generated by this export.
There are {len(rows)} candidates. This CSV is not an accuracy result.
Keep this directory and all source recordings outside the public checkout.

1. Read the repository VALIDATION_PROTOCOL.md and OPEN_CORPUS_PREPARATION.md.
   A qualified reviewer/custodian must freeze a dated review protocol BEFORE
   inspecting formants, with window/timing, uncertainty and dispute rules.
   Record that protocol's private evidence path/hash in attestation.json.
2. Open each audio_path relative to {queue_path.parent} in Praat or equivalent.
   Inspect the manual TextGrid, waveform, spectrogram and listening context.
   Reviewers must not see VowelScope predictions; final labels stay hidden
   from model tuning. Automatic tracking proposals require human checking.
3. Work on a copy of reviews.csv. Preserve ALL identity/digest columns and
   ALL rows, including annotation warnings. Set decision to include or exclude.
   Every disposition needs reviewer, method, evidence and adjudication
   (not_disputed or a traceable adjudication record). The midpoint is only a
   proposal; included rows need the exact reviewed gt_time_s within start/end,
   0 < gt_f1_hz < gt_f2_hz and finite nonnegative uncertainty_f1_hz/f2_hz.
   Record the reviewed window/settings in method/evidence. Do not use class
   averages or unchecked automatic estimates as reference frequencies.
4. Exclude only for predeclared reference/data quality reasons:
   {', '.join(EXCLUSIONS)}. Explain the reason in evidence and leave all
   measurement/uncertainty fields blank. Never exclude detector failures.
   If an interval is wrong, exclude and document it; do not silently edit it.
5. The custodian fills attestation.json only after confirming blinding,
   no predictions yet, and previously unused speakers. These declarations
   are audit records; this program cannot certify expertise or honesty.
6. Import the completed CSV with the original queue and frozen plan. Every
   candidate must have a completed disposition and >=20 speakers / >=200
   included references must remain. Preserve the original pending queue.
   Do not run final predictions until eligibility, reviewed manifest, exact
   evaluator/candidate digests and configuration are frozen by the custodian.

The corpus license/README remain in the private cache. Source attribution and
CC BY-NC 4.0 scope still apply. Physical microphone tests are a separate gate.
"""
    with (output_dir / 'README.md').open('x', encoding='utf8') as stream:
        stream.write(guide)
    return summary


def finite_number(row, field):
    try:
        value = float(row[field])
    except (ValueError, TypeError):
        raise ValueError('Missing or invalid reference field: ' + field) from None
    if not math.isfinite(value):
        raise ValueError('Nonfinite reference field: ' + field)
    return value


def import_reviews(queue, plan, reviews, attestation, output):
    queue_path, source, frozen, queue_hash, plan_hash, expected = load_inputs(queue, plan)
    reviews = outside_checkout(reviews, CHECKOUT, 'Private review CSV')
    attestation = outside_checkout(attestation, CHECKOUT, 'Private custodian attestation')
    output = outside_checkout(output, CHECKOUT, 'Private reviewed manifest')
    if output.exists():
        raise FileExistsError('Reviewed manifest already exists')
    if output.parent != queue_path.parent:
        raise ValueError('Manifest must be directly inside the original private cache for audio paths')
    if not attestation.is_file():
        raise ValueError('Custodian attestation is required')
    declaration = read_json(attestation)
    if declaration.get('queue_sha256') != queue_hash or declaration.get('plan_sha256') != plan_hash:
        raise ValueError('Custodian queue/plan digest mismatch')
    for key in ('custodian', 'review_protocol_evidence'):
        if not isinstance(declaration.get(key), str) or not declaration[key].strip():
            raise ValueError('Missing custodian attestation: ' + key)
    for key in ('previously_unused_speakers_confirmed', 'blinded_reference_review', 'no_predictions_generated'):
        if declaration.get(key) is not True:
            raise ValueError('Custodian has not confirmed: ' + key)
    with reviews.open(newline='', encoding='utf-8-sig') as stream:
        reader = csv.DictReader(stream)
        if reader.fieldnames is None or len(reader.fieldnames) != len(FIELDS) or set(reader.fieldnames) != set(FIELDS):
            raise ValueError('Unexpected or duplicate review CSV columns')
        rows = list(reader)
    seen, samples, exclusions = set(), [], []
    for row in rows:
        token_id = row.get('token_id')
        if token_id not in expected or token_id in seen:
            raise ValueError('Unknown or duplicate candidate identity')
        seen.add(token_id)
        identity, original = expected[token_id]
        if any(row.get(key) != identity[key] for key in IMMUTABLE) or None in row:
            raise ValueError('Changed candidate identity or queue/plan digest')
        if row['decision'] not in ('include', 'exclude'):
            raise ValueError('Every candidate needs a completed disposition')
        for key in ('reviewer', 'method', 'evidence', 'adjudication'):
            if not isinstance(row[key], str) or not row[key].strip():
                raise ValueError('Missing reference review provenance: ' + key)
        record = {key: row[key] for key in REVIEW}
        record['token_id'] = token_id
        if row['decision'] == 'exclude':
            if row['exclusion_reason'] not in EXCLUSIONS or any(row[key] for key in MEASUREMENTS):
                raise ValueError('Invalid exclusion reason or nonblank excluded measurements')
            exclusions.append(dict(original, review=record))
            continue
        if row['exclusion_reason']:
            raise ValueError('Included reference has an exclusion reason')
        numbers = {key: finite_number(row, key) for key in MEASUREMENTS}
        if not (0 < numbers['gt_f1_hz'] < numbers['gt_f2_hz'] and
                original['start_s'] <= numbers['gt_time_s'] <= original['end_s'] and
                numbers['uncertainty_f1_hz'] >= 0 and numbers['uncertainty_f2_hz'] >= 0):
            raise ValueError('Invalid reference frequencies, time or uncertainty')
        samples.append(dict(original, **numbers, reference_review_status='reviewed',
                            split='test', review=record))
    if seen != set(expected):
        raise ValueError('Missing candidate dispositions')
    speakers = len({sample['speaker_id'] for sample in samples})
    if len(samples) < 200 or speakers < 20:
        raise ValueError('Independent evaluation requires >=200 included references and >=20 speakers')
    summary = dict(candidates=len(expected), included=len(samples), excluded=len(exclusions),
                   speaker_count=speakers, predictions_generated=False)
    manifest = dict(kind='acoustic_reference_manifest', schema_version=1,
        reference_review_status='reviewed', source=source.get('source'),
        version=source.get('source_commit'), license=source.get('license'),
        file_sha256=source['file_sha256'], samples=samples, exclusions=exclusions,
        summary=summary, review_provenance=dict(queue_sha256=queue_hash, plan_sha256=plan_hash,
            reviews_sha256=digest(reviews), attestation_sha256=digest(attestation),
            custodian_attestation=declaration, frozen_evaluation_plan=frozen,
            import_code_sha256=digest(Path(__file__)), import_git_context=git_provenance(CHECKOUT)),
        limitations='Completeness checks do not certify reference expertise, accuracy or independence. '
                     'Freeze final eligibility/evaluator before prediction; this import does not run accuracy.')
    write_json(output, manifest)
    return summary


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('action', choices=('export', 'import'))
    parser.add_argument('--queue', type=Path, required=True)
    parser.add_argument('--plan', type=Path, required=True)
    parser.add_argument('--out', type=Path, required=True)
    parser.add_argument('--reviews', type=Path)
    parser.add_argument('--attestation', type=Path)
    args = parser.parse_args()
    try:
        if args.action == 'export':
            result = export_packet(args.queue, args.plan, args.out)
        else:
            if args.reviews is None or args.attestation is None:
                parser.error('import requires --reviews and --attestation')
            result = import_reviews(args.queue, args.plan, args.reviews, args.attestation, args.out)
    except (ValueError, OSError, KeyError) as error:
        parser.exit(1, f'Reference review rejected: {error}\n')
    print(json.dumps(result))


if __name__ == '__main__':
    main()

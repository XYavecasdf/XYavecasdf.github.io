"""Synthetic fixtures only: these tests do not inspect independent references."""
import csv
import hashlib
import importlib
import json
from pathlib import Path
import tempfile
import unittest


class ReferenceReviewTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.root = Path(self.tmp.name)
        self.cache = self.root / 'cache'
        self.cache.mkdir()
        (self.cache / 'audio.wav').write_bytes(b'synthetic source integrity fixture')
        rows = [dict(audio_path='audio.wav', speaker_id=f'fixture-{i % 20}',
                     language='en-l2', actual_phone='IY', annotation_warning=False,
                     start_s=i + .1, end_s=i + .4, proposed_reference_time_s=i + .25,
                     gt_time_s=None, gt_f1_hz=None, gt_f2_hz=None,
                     reference_review_status='pending', split='independent_pending_review')
                for i in range(200)]
        self.queue = self.cache / 'queue.json'
        self.write_json(self.queue, dict(kind='reference_review_queue',
            reference_review_status='pending', source='synthetic test only',
            source_commit='fixture', license='fixture',
            selection_protocol={'dsp_predictions_generated': False},
            file_sha256={'audio.wav': self.digest(self.cache / 'audio.wav')}, samples=rows))
        self.plan = self.root / 'plan.json'
        self.write_json(self.plan, dict(independent=dict(queue_sha256=self.digest(self.queue))))
        self.packet = self.root / 'packet'
        self.output = self.cache / 'reviewed.json'

    def api(self):
        self.assertTrue(Path('vowelscope/validation/reference_review.py').exists(),
                        'Private reference-review export/import utility is missing')
        return importlib.import_module('reference_review')

    @staticmethod
    def digest(path):
        return hashlib.sha256(path.read_bytes()).hexdigest()

    @staticmethod
    def write_json(path, data):
        path.write_text(json.dumps(data), encoding='utf8')

    def read_rows(self):
        with (self.packet / 'reviews.csv').open(newline='', encoding='utf8') as stream:
            return list(csv.DictReader(stream))

    def save_rows(self, rows):
        with (self.packet / 'reviews.csv').open('w', newline='', encoding='utf8') as stream:
            writer = csv.DictWriter(stream, fieldnames=list(rows[0]))
            writer.writeheader()
            writer.writerows(rows)

    def completed_packet(self):
        self.api().export_packet(self.queue, self.plan, self.packet)
        rows = self.read_rows()
        for i, row in enumerate(rows):
            row.update(decision='include', gt_time_s=str(i + .25), gt_f1_hz='300',
                       gt_f2_hz='2300', reviewer='fixture reviewer',
                       method='manually reviewed spectrogram', evidence='fixture evidence',
                       uncertainty_f1_hz='20', uncertainty_f2_hz='40',
                       adjudication='not_disputed')
        self.save_rows(rows)
        self.write_json(self.packet / 'attestation.json', dict(
            queue_sha256=self.digest(self.queue), plan_sha256=self.digest(self.plan),
            custodian='fixture custodian', previously_unused_speakers_confirmed=True,
            blinded_reference_review=True, no_predictions_generated=True,
            review_protocol_evidence='fixture protocol frozen before review'))
        return rows

    def import_packet(self):
        return self.api().import_reviews(self.queue, self.plan,
            self.packet / 'reviews.csv', self.packet / 'attestation.json', self.output)

    def test_export_has_all_candidates_and_no_invented_references(self):
        summary = self.api().export_packet(self.queue, self.plan, self.packet)
        rows = self.read_rows()
        self.assertEqual(summary['candidate_count'], 200)
        self.assertEqual(len({r['token_id'] for r in rows}), 200)
        for row in rows:
            self.assertEqual(row['decision'], 'pending')
            self.assertTrue(all(row[k] == '' for k in ('gt_time_s', 'gt_f1_hz', 'gt_f2_hz')))
        with self.assertRaises(FileExistsError):
            self.api().export_packet(self.queue, self.plan, self.packet)

    def test_completed_manifest_preserves_source_identity_and_review_evidence(self):
        self.completed_packet()
        summary = self.import_packet()
        manifest = json.loads(self.output.read_text())
        self.assertEqual(summary['included'], 200)
        self.assertEqual(summary['speaker_count'], 20)
        self.assertEqual(manifest['kind'], 'acoustic_reference_manifest')
        row = manifest['samples'][0]
        self.assertEqual(row['actual_phone'], 'IY')
        self.assertEqual(row['reference_review_status'], 'reviewed')
        self.assertEqual(row['split'], 'test')
        self.assertEqual(row['gt_f2_hz'], 2300)
        self.assertTrue((self.output.parent / row['audio_path']).is_file())
        self.assertEqual(manifest['review_provenance']['reviews_sha256'],
                         self.digest(self.packet / 'reviews.csv'))
        with self.assertRaises(FileExistsError):
            self.import_packet()

    def test_pending_packet_cannot_be_imported(self):
        self.api().export_packet(self.queue, self.plan, self.packet)
        with self.assertRaises(ValueError):
            self.import_packet()
        self.assertFalse(self.output.exists())

    def test_missing_duplicate_extra_and_edited_candidates_are_rejected(self):
        original = self.completed_packet()
        bad_cases = [original[:-1], original + [dict(original[0])],
                     [dict(original[0], token_id='unknown')] + original[1:],
                     [dict(original[0], audio_path='../other.wav')] + original[1:],
                     [dict(original[0], start_s='99')] + original[1:]]
        for rows in bad_cases:
            with self.subTest(case=rows[0]['token_id']):
                self.save_rows(rows)
                with self.assertRaises(ValueError):
                    self.import_packet()
                self.assertFalse(self.output.exists())

    def test_invalid_references_and_missing_review_provenance_are_rejected(self):
        original = self.completed_packet()
        for field, value in [('decision', 'pending'), ('gt_f1_hz', 'nan'),
                             ('gt_f1_hz', '0'), ('gt_f2_hz', '200'),
                             ('gt_time_s', '9'), ('uncertainty_f2_hz', '-1'),
                             ('reviewer', ''), ('method', ''), ('evidence', ''),
                             ('adjudication', '')]:
            with self.subTest(field=field, value=value):
                self.save_rows([dict(original[0], **{field: value})] + original[1:])
                with self.assertRaises(ValueError):
                    self.import_packet()
                self.assertFalse(self.output.exists())

    def test_exclusions_have_reasons_and_remain_in_audit_without_lowering_minimum(self):
        rows = self.completed_packet()
        rows[0].update(decision='exclude', exclusion_reason='detector_failed')
        self.save_rows(rows)
        with self.assertRaisesRegex(ValueError, 'exclusion'):
            self.import_packet()
        rows[0]['exclusion_reason'] = 'unresolvable_formants'
        for field in ('gt_time_s', 'gt_f1_hz', 'gt_f2_hz', 'uncertainty_f1_hz', 'uncertainty_f2_hz'):
            rows[0][field] = ''
        self.save_rows(rows)
        with self.assertRaisesRegex(ValueError, '200'):
            self.import_packet()
        self.assertFalse(self.output.exists())

    def test_changed_queue_plan_or_source_bytes_are_rejected(self):
        self.completed_packet()
        audio = self.cache / 'audio.wav'
        audio.write_bytes(b'changed')
        with self.assertRaisesRegex(ValueError, 'integrity'):
            self.import_packet()
        audio.write_bytes(b'synthetic source integrity fixture')
        self.plan.write_text(self.plan.read_text() + ' ')
        with self.assertRaisesRegex(ValueError, 'plan'):
            self.import_packet()
        self.queue.write_text(self.queue.read_text() + ' ')
        with self.assertRaisesRegex(ValueError, 'queue'):
            self.import_packet()

    def test_valid_exclusion_is_preserved_in_audit(self):
        queue = json.loads(self.queue.read_text())
        extra = dict(queue['samples'][0], start_s=201.1, end_s=201.4,
                     proposed_reference_time_s=201.25)
        queue['samples'].append(extra)
        self.write_json(self.queue, queue)
        self.write_json(self.plan, dict(independent=dict(queue_sha256=self.digest(self.queue))))
        rows = self.completed_packet()
        rows[-1].update(decision='exclude', exclusion_reason='unresolvable_formants')
        for field in ('gt_time_s', 'gt_f1_hz', 'gt_f2_hz', 'uncertainty_f1_hz', 'uncertainty_f2_hz'):
            rows[-1][field] = ''
        self.save_rows(rows)
        summary = self.import_packet()
        self.assertEqual((summary['included'], summary['excluded']), (200, 1))
        manifest = json.loads(self.output.read_text())
        self.assertEqual(manifest['exclusions'][0]['review']['exclusion_reason'],
                         'unresolvable_formants')

    def test_enough_tokens_without_twenty_speakers_is_rejected(self):
        queue = json.loads(self.queue.read_text())
        for i, row in enumerate(queue['samples']):
            row['speaker_id'] = f'fixture-{i % 19}'
        self.write_json(self.queue, queue)
        self.write_json(self.plan, dict(independent=dict(queue_sha256=self.digest(self.queue))))
        self.completed_packet()
        with self.assertRaisesRegex(ValueError, '20 speakers'):
            self.import_packet()
        self.assertFalse(self.output.exists())

    def test_unverified_paths_and_checkout_outputs_are_rejected(self):
        module = self.api()
        self.completed_packet()
        with self.assertRaises(ValueError):
            module.import_reviews(self.queue, self.plan, self.packet / 'reviews.csv',
                self.packet / 'attestation.json', module.CHECKOUT / 'private.json')
        audio = self.cache / 'audio.wav'
        data = audio.read_bytes()
        audio.unlink()
        (self.root / 'elsewhere.wav').write_bytes(data)
        audio.symlink_to(self.root / 'elsewhere.wav')
        with self.assertRaisesRegex(ValueError, 'escape'):
            self.import_packet()

    def test_absent_custodian_attestation_blocks_scoring_manifest(self):
        self.completed_packet()
        attestation = self.packet / 'attestation.json'
        data = json.loads(attestation.read_text())
        for field in ('blinded_reference_review', 'previously_unused_speakers_confirmed',
                      'no_predictions_generated'):
            self.write_json(attestation, dict(data, **{field: False}))
            with self.assertRaises(ValueError):
                self.import_packet()
        self.assertFalse(self.output.exists())

    def test_same_cache_leaf_and_parent_symlinks_cannot_replace_source_paths(self):
        self.completed_packet()
        audio = self.cache / 'audio.wav'
        original = audio.read_bytes()
        alias = self.cache / 'same-bytes.wav'
        alias.write_bytes(original)
        audio.unlink()
        audio.symlink_to(alias)
        with self.assertRaisesRegex(ValueError, 'symlink'):
            self.import_packet()
        self.assertFalse(self.output.exists())
        audio.unlink()
        audio.write_bytes(original)
        real = self.cache / 'real'
        real.mkdir()
        (real / 'audio.wav').write_bytes(original)
        (self.cache / 'alias').symlink_to(real, target_is_directory=True)
        queue = json.loads(self.queue.read_text())
        queue['file_sha256'] = {'alias/audio.wav': self.digest(audio)}
        for row in queue['samples']:
            row['audio_path'] = 'alias/audio.wav'
        self.write_json(self.queue, queue)
        self.write_json(self.plan, dict(independent=dict(queue_sha256=self.digest(self.queue))))
        with self.assertRaisesRegex(ValueError, 'symlink'):
            self.api().export_packet(self.queue, self.plan, self.root / 'alias-packet')


if __name__ == '__main__':
    unittest.main()

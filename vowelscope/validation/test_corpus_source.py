"""Offline regressions for verified corpus bytes and reproducible runner reports."""
import hashlib
import importlib
import io
import inspect
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest
from unittest import mock
import zipfile

sys.path.insert(0, str(Path(__file__).resolve().parent))
try:
    corpus_source = importlib.import_module('corpus_source')
except ModuleNotFoundError:
    corpus_source = None
import run_phase3_poles as phase3
import run_hillenbrand as hillenbrand

PINNED = '2560548591e3a726c88549b6dc9d226995616c26874d601c69fee8b9eee9d730'


class CorpusSourceTests(unittest.TestCase):
    def require_source(self):
        self.assertIsNotNone(corpus_source, 'shared verified corpus acquisition is missing')
        return corpus_source

    def test_authorized_digest_is_fixed(self):
        source = self.require_source()
        self.assertEqual(source.ARCHIVE_SHA256, PINNED)

    def test_invalid_cache_digest_rejected_before_zip_open_in_both_runners(self):
        with tempfile.TemporaryDirectory() as folder:
            archive = Path(folder) / 'archive.zip'
            archive.write_bytes(b'not the authorized archive')
            for runner in (phase3, hillenbrand):
                with self.subTest(runner=runner.__name__):
                    self.assertIn('argv', inspect.signature(runner.main).parameters,
                                  'runner must accept cache CLI options')
                    with mock.patch('zipfile.ZipFile', side_effect=AssertionError('ZIP opened before digest verification')):
                        with self.assertRaisesRegex(ValueError, 'SHA-256 mismatch'):
                            runner.main(['--archive-cache', str(archive)])
            self.assertEqual(archive.read_bytes(), b'not the authorized archive')

    def test_valid_cache_returns_exact_bytes_without_network_or_modification(self):
        source = self.require_source()
        fixture = io.BytesIO()
        with zipfile.ZipFile(fixture, 'w') as archive:
            archive.writestr('vowdata.dat', 'offline fixture')
        data = fixture.getvalue()
        with tempfile.TemporaryDirectory() as folder:
            cache = Path(folder) / 'archive.zip'
            cache.write_bytes(data)
            with mock.patch.object(source, 'ARCHIVE_SHA256', hashlib.sha256(data).hexdigest()):
                with mock.patch('urllib.request.urlopen', side_effect=AssertionError('cache requested network')):
                    loaded, digest = source.acquire_archive(cache)
            self.assertEqual(loaded, data)
            self.assertEqual(digest, hashlib.sha256(data).hexdigest())
            self.assertEqual(cache.read_bytes(), data)

    def test_network_digest_is_verified_without_disabling_tls(self):
        source = self.require_source()
        with mock.patch('urllib.request.urlopen', return_value=io.BytesIO(b'corrupt download')) as opener:
            with self.assertRaisesRegex(ValueError, 'SHA-256 mismatch'):
                source.acquire_archive()
        request = opener.call_args.args[0]
        self.assertTrue(request.full_url.startswith('https://'))
        self.assertNotIn('context', opener.call_args.kwargs)


class ProvenanceTests(unittest.TestCase):
    def test_real_head_and_dirty_state_ignore_misleading_environment_sha(self):
        self.assertIsNotNone(corpus_source, 'Git provenance helper is missing')
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            subprocess.run(['git', 'init', '-q', str(root)], check=True)
            (root / 'source.txt').write_text('baseline')
            subprocess.run(['git', '-C', str(root), 'add', 'source.txt'], check=True)
            subprocess.run(['git', '-C', str(root), '-c', 'user.name=Fixture', '-c',
                            'user.email=fixture@example.invalid', 'commit', '-qm', 'fixture'], check=True)
            head = subprocess.check_output(['git', '-C', str(root), 'rev-parse', 'HEAD'], text=True).strip()
            with mock.patch.dict('os.environ', {'GITHUB_SHA': 'incorrect-environment-sha'}):
                clean = corpus_source.git_provenance(root)
            self.assertEqual(clean['source_commit'], head)
            self.assertFalse(clean['source_dirty'])
            (root / 'source.txt').write_text('changed')
            dirty = corpus_source.git_provenance(root)
            self.assertEqual(dirty['source_commit'], head)
            self.assertTrue(dirty['source_dirty'])
            self.assertNotEqual(clean['source_diff_sha256'], dirty['source_diff_sha256'])
            (root / 'source.txt').write_text('baseline')
            (root / 'untracked.txt').write_text('new input')
            self.assertTrue(corpus_source.git_provenance(root)['source_dirty'])


class Phase3OutputTests(unittest.TestCase):
    def options(self, argv, root):
        self.assertTrue(hasattr(phase3, 'parse_options'), 'explicit output selection is missing')
        return phase3.parse_options(argv, checkout_root=root)

    def test_default_path_keeps_ci_compatibility_and_external_output_is_selected(self):
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder) / 'checkout'
            root.mkdir()
            default = self.options([], root)
            self.assertEqual(default.out, root / 'vowelscope/validation/public-dataset/phase3-pole-dev.json')
            external = Path(folder) / 'reports' / 'aggregate.json'
            opts = self.options(['--out', str(external)], root)
            self.assertEqual(opts.out, external)

    def test_explicit_output_inside_checkout_or_symlink_is_rejected(self):
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder) / 'checkout'
            root.mkdir()
            alias = Path(folder) / 'alias'
            alias.symlink_to(root, target_is_directory=True)
            for path in (root / 'report.json', alias / 'report.json'):
                with self.subTest(path=path), self.assertRaisesRegex(ValueError, 'outside the checkout'):
                    self.options(['--out', str(path)], root)

    def test_existing_explicit_output_is_preserved(self):
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder) / 'checkout'
            root.mkdir()
            report = Path(folder) / 'archive.json'
            report.write_text('{"archived": true}')
            with self.assertRaises(FileExistsError):
                self.options(['--out', str(report)], root)
            self.assertEqual(json.loads(report.read_text()), {'archived': True})

    def test_variants_subset_and_legacy_smoothing_are_explicit(self):
        with tempfile.TemporaryDirectory() as folder:
            opts = self.options(['--variants', 'original_acoustic', 'pole14_fs12000_poly33',
                                 '--smoothing', 'legacy'], Path(folder))
            self.assertEqual(opts.variants, ['original_acoustic', 'pole14_fs12000_poly33'])
            self.assertEqual(opts.smoothing, 'legacy')

    def test_zero_interpolation_correction_is_selectable_but_not_added_to_historical_defaults(self):
        with tempfile.TemporaryDirectory() as folder:
            root=Path(folder)/'checkout';root.mkdir()
            opts=self.options(['--variants','original_acoustic','original_acoustic_zero_safe',
                               '--out',str(Path(folder)/'new-report.json')],root)
            self.assertEqual(opts.variants,['original_acoustic','original_acoustic_zero_safe'])
            self.assertNotIn('original_acoustic_zero_safe',self.options([],root).variants)

    def test_new_zero_experiment_cannot_overwrite_a_historical_default_report(self):
        with tempfile.TemporaryDirectory() as folder:
            with self.assertRaisesRegex(ValueError,'requires an explicit external --out'):
                self.options(['--variants','original_acoustic','original_acoustic_zero_safe'],Path(folder))

    def test_adaptive_fir_requires_external_output_and_keeps_historical_defaults(self):
        with tempfile.TemporaryDirectory() as folder:
            root=Path(folder)/'checkout';root.mkdir()
            args=['--variants','pole14_fs12000_poly33','pole14_fs12000_poly_adaptive']
            opts=self.options(args+['--out',str(Path(folder)/'new-report.json')],root)
            self.assertEqual(opts.variants,['pole14_fs12000_poly33','pole14_fs12000_poly_adaptive'])
            self.assertNotIn('pole14_fs12000_poly_adaptive',self.options([],root).variants)
            with self.assertRaisesRegex(ValueError,'requires an explicit external --out'):
                self.options(args,root)

    def test_run_configuration_records_actual_benchmark_protocol_and_subset(self):
        self.assertTrue(hasattr(phase3, 'run_configuration'), 'exact run configuration is missing')
        with tempfile.TemporaryDirectory() as folder:
            opts = self.options(['--variants', 'original_acoustic', '--smoothing', 'legacy'], Path(folder))
            reports = {'original_acoustic': {'replay_protocol': 'legacy-slider60-v1',
                'smoothing_value': 60, 'measurement': 'acoustic', 'code_digest': 'source-digest',
                'page_digest':'page-digest','dsp_patch_digest':'patch-digest'}}
            config = phase3.run_configuration(opts, reports)
            self.assertEqual(config['smoothing'], 'legacy')
            self.assertEqual(config['variants'], ['original_acoustic'])
            self.assertEqual(config['benchmark_configuration']['original_acoustic']['smoothing_value'], 60)
            self.assertEqual(config['benchmark_configuration']['original_acoustic']['replay_protocol'],
                             'legacy-slider60-v1')
            self.assertEqual(config['benchmark_configuration']['original_acoustic']['code_digest'], 'source-digest')
            self.assertEqual(config['benchmark_configuration']['original_acoustic'].get('page_digest'),'page-digest')
            self.assertEqual(config['benchmark_configuration']['original_acoustic'].get('dsp_patch_digest'),'patch-digest')
            self.assertEqual(config['split'], 'dev')
            self.assertEqual(config['mode'], 'classic')
            self.assertEqual(config['python_version'], sys.version.split()[0])
            self.assertIn('node_version', config, 'runtime provenance is missing')
            self.assertIn('runner_sources_sha256', config, 'runner source hashes are missing')
            self.assertRegex(config['node_version'], r'^v[0-9]+\.')
            self.assertEqual(config['runner_sources_sha256']['validation/run_phase3_poles.py'],
                             hashlib.sha256(Path(phase3.__file__).read_bytes()).hexdigest())
            self.assertEqual(config['runner_sources_sha256']['validation/corpus_source.py'],
                             hashlib.sha256(Path(corpus_source.__file__).read_bytes()).hexdigest())

    def test_external_report_writer_creates_only_chosen_aggregate(self):
        self.assertTrue(hasattr(phase3, 'write_summary'), 'safe aggregate writer is missing')
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder) / 'checkout'
            root.mkdir()
            existing = root / 'vowelscope/validation/public-dataset/phase3-pole-dev.json'
            existing.parent.mkdir(parents=True)
            existing.write_text('{"archived": true}')
            out = Path(folder) / 'reports' / 'new.json'
            opts = self.options(['--out', str(out)], root)
            phase3.write_summary({'sample_count': 3}, opts)
            self.assertEqual(json.loads(out.read_text()), {'sample_count': 3})
            self.assertEqual(json.loads(existing.read_text()), {'archived': True})
            with self.assertRaises(FileExistsError):
                phase3.write_summary({'sample_count': 7}, opts)
            self.assertEqual(json.loads(out.read_text()), {'sample_count': 3})


if __name__ == '__main__':
    unittest.main()

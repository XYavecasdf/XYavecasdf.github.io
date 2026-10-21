import importlib
from pathlib import Path
import unittest


class SpeakerBootstrapTests(unittest.TestCase):
    def api(self):
        self.assertTrue(Path('vowelscope/validation/uncertainty.py').exists(),
                        'Speaker-cluster uncertainty estimator is missing')
        return importlib.import_module('uncertainty').speaker_bootstrap

    def test_known_two_speaker_distribution_and_reproducibility(self):
        rows=[{'speaker_id':'a','detected':True,'error':{'f1_abs_hz':10,'f2_abs_hz':20}},
              {'speaker_id':'b','detected':True,'error':{'f1_abs_hz':100,'f2_abs_hz':200}}]
        bootstrap=self.api();first=bootstrap(rows,replicates=2000,seed=20261013)
        self.assertEqual(first,bootstrap(rows,replicates=2000,seed=20261013))
        self.assertEqual(first['speaker_count'],2)
        self.assertEqual(first['intervals']['coverage'],[1.0,1.0])
        self.assertEqual(first['intervals']['mae_f1_hz'],[10.0,100.0])
        self.assertEqual(first['intervals']['mae_f2_hz'],[20.0,200.0])

    def test_failed_detections_remain_in_coverage_and_empty_error_replicates_are_reported(self):
        rows=[{'speaker_id':'a','detected':True,'error':{'f1_abs_hz':10,'f2_abs_hz':20}},
              {'speaker_id':'b','detected':False,'error':{'f1_abs_hz':None,'f2_abs_hz':None}}]
        result=self.api()(rows,replicates=200,seed=20261013)
        self.assertEqual(result['intervals']['coverage'],[0.0,1.0])
        self.assertGreater(result['undefined_error_replicates'],0)
        self.assertNotIn('speaker_id',str(result))

    def test_missing_speaker_cluster_ids_are_not_silently_treated_as_independent_tokens(self):
        with self.assertRaises(ValueError):
            self.api()([{'detected':False,'error':{'f1_abs_hz':None,'f2_abs_hz':None}}])


if __name__=='__main__':unittest.main()

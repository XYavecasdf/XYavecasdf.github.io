import copy
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest


def fixture(smoothing='default', variant='original'):
    value={'default':58,'fast':0,'none':-53.3333333333333}[smoothing]
    return {'schema_version':2,'replay_protocol':'html-defaults-v2','source_commit':'a'*40,
            'source_dirty':False,'code_digest':'b'*64,'page_digest':'c'*64,'dsp_patch_digest':'d'*64,
            'smoothing':smoothing,'smoothing_value':value,'dsp_variant':variant,
            'measurement':'visual','source_html':'vowelscope/index.html','source':'synthetic fixture',
            'dataset_version':'fixture-1','split':'dev','results':[{
                'audio_path':'private-fixture.wav','start_s':0,'end_s':1,'speaker_id':'synthetic',
                'detected':True,'error':{'f1_abs_hz':10,'f2_abs_hz':20}}]}


class ReportContextTests(unittest.TestCase):
    def test_smoothing_aggregation_preserves_v2_configuration_and_actual_alpha(self):
        with tempfile.TemporaryDirectory() as directory:
            root=Path(directory);args=[sys.executable,'vowelscope/validation/compare_smoothing.py']
            for name in ('default','fast','none','median3','median5'):
                r=fixture('none' if name.startswith('median') else name,
                          name if name.startswith('median') else 'original')
                file=root/(name+'.json');file.write_text(json.dumps(r));args+=['--'+name,str(file)]
            out=root/'aggregate.json';args+=['--out',str(out)]
            subprocess.run(args,check=True,capture_output=True)
            result=json.loads(out.read_text())
            self.assertIn('default alpha=0.332',result['note'])
            self.assertIn('replay_configurations',result)
            context=result['replay_configurations']['default']
            self.assertEqual(context['smoothing_value'],58)
            self.assertEqual(context['code_digest'],'b'*64)
            self.assertNotIn('private-fixture.wav',json.dumps(result))
            self.assertNotIn('synthetic',json.dumps(context))

    def test_context_api_rejects_unknown_or_different_protocol_baseline_comparison(self):
        self.assertTrue(Path('vowelscope/validation/report_context.py').exists(),
                        'Shared aggregation context API does not exist')
        from report_context import replay_compatible, report_context
        report=fixture()
        self.assertTrue(replay_compatible(report,copy.deepcopy(report)))
        legacy=fixture();legacy['smoothing_value']=60
        self.assertFalse(replay_compatible(report,legacy))
        self.assertFalse(replay_compatible(report,{'schema_version':1}))
        context=report_context(report)
        self.assertEqual(context['dsp_patch_digest'],'d'*64)
        self.assertNotIn('results',context)

    def test_hillenbrand_aggregate_preserves_each_input_context(self):
        import run_hillenbrand
        self.assertTrue(hasattr(run_hillenbrand,'attach_run_context'))
        stats={};run_hillenbrand.attach_run_context(stats,{'classic':fixture()})
        self.assertEqual(stats['replay_configurations']['classic']['smoothing_value'],58)
        self.assertRegex(stats['source_commit'],r'^[a-f0-9]{40}$')
        self.assertEqual(stats['evaluation_source_commit'],stats['source_commit'])


if __name__=='__main__':unittest.main()

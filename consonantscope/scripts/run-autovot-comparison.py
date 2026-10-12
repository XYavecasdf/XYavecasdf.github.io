#!/usr/bin/env python3
"""Pinned, unmodified native AutoVOT versus the browser heuristic; no training."""
import argparse, pathlib, subprocess, sys, tempfile

def main():
    p=argparse.ArgumentParser()
    p.add_argument('--data',help='Optional corpus cache')
    p.add_argument('--source',help='Optional upstream source/model cache')
    p.add_argument('--output',help='Report directory; defaults to validation/')
    a=p.parse_args()
    root=pathlib.Path(__file__).resolve().parents[1]
    output=pathlib.Path(a.output).resolve() if a.output else root/'validation'
    def run(command,cwd=root,log=None):
        if log:
            with open(log,'w') as stream:
                subprocess.run(command,check=True,cwd=cwd,stdout=stream,stderr=subprocess.STDOUT)
        else:
            subprocess.run(command,check=True,cwd=cwd)
    with tempfile.TemporaryDirectory(prefix='consonantscope-autovot-') as temporary:
        work=pathlib.Path(temporary)
        data=pathlib.Path(a.data).resolve() if a.data else work/'corpus'
        source=pathlib.Path(a.source).resolve() if a.source else work/'upstream'
        run([sys.executable,str(root/'scripts/run-validation.py'),'--data',str(data),'--output',str(output)])
        run([sys.executable,str(root/'scripts/fetch-autovot.py'),'--source',str(source)])
        run([sys.executable,str(root/'scripts/build-autovot.py'),'--source',str(source),'--output',str(work/'bin')])
        models=source/'experiments/models'
        for protocol in ['snippet','context']:
            folder=work/protocol
            command=['node',str(root/'scripts/prepare-autovot.cjs'),'--data',str(data),'--output',str(folder),'--baseline',str(output/'results.json')]
            if protocol=='context': command.append('--context')
            run(command)
            run([str(work/'bin/VotFrontEnd2'),str(folder/'inputs.txt'),str(folder/'feature-files.txt'),'null'],cwd=folder,log=folder/'frontend.log')
            for model,base in [('bb','bb_jasa.classifier'),('pgwords','nattalia_jasa.classifier')]:
                run([str(work/'bin/VotDecode'),'-verbose','WARNING','-pos_only','-min_vot_length','15','-max_vot_length','250','-output_predictions',str(folder/(model+'-predictions.txt')),str(folder/'feature-files.txt'),'null',str(models/base)],cwd=folder,log=folder/(model+'-decode.log'))
        run(['node',str(root/'scripts/summarize-autovot.cjs'),'--baseline',str(output/'results.json'),'--snippet',str(work/'snippet'),'--context',str(work/'context'),'--output',str(output)])

if __name__=='__main__': main()

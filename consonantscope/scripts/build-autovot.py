#!/usr/bin/env python3
"""Build unchanged upstream inference code; native CLI avoids old Python dependencies."""
import argparse, pathlib, shutil, subprocess

def main():
    parser=argparse.ArgumentParser()
    parser.add_argument('--source',required=True)
    parser.add_argument('--output',required=True)
    args=parser.parse_args()
    root=pathlib.Path(args.source).resolve()/'autovot/code'
    out=pathlib.Path(args.output).resolve()
    out.mkdir(parents=True,exist_ok=True)
    infra=root/'learning_tools/infra2'
    learn=root/'learning_tools'
    vot=root/'vot_predictor'
    common=[str(infra/name) for name in ['infra_vv_funcs.cpp','infra_vm_funcs.cpp','infra_mm_funcs.cpp','infra_exception.cpp','infra_binary.cpp']]+[str(learn/'cmdline/cmd_line.cpp')]
    flags=['g++','-std=gnu++11','-O2','-fpermissive','-I'+str(infra),'-I'+str(learn),'-I'+str(vot)]
    front=[str(vot/name) for name in ['VotFrontEnd2.cpp','Dataset.cpp','infra_dsp.cpp','FFTReal/FFTReal.cpp','get_f0s.cpp','sigproc.cpp','WavFile.cpp']]
    decode=[str(vot/name) for name in ['VotDecode.cpp','Classifier.cpp','Dataset.cpp','KernelExpansion.cpp']]
    for name,sources in [('VotFrontEnd2',front),('VotDecode',decode)]:
        result=subprocess.run(flags+sources+common+['-o',str(out/name)],stdout=subprocess.PIPE,stderr=subprocess.STDOUT,text=True)
        (out/(name+'-build.log')).write_text(result.stdout)
        if result.returncode:
            raise RuntimeError(f'{name} failed; see {out/(name+"-build.log")}')
        print(name,'compiled successfully')
    # The current loader requires .pos/.neg companions. This legacy model is positive-only.
    models=pathlib.Path(args.source).resolve()/'experiments/models'
    shutil.copyfile(models/'nattalia_jasa.classifier',models/'nattalia_jasa.classifier.pos')
    # This all-zero negative vector is ignored by inference with -pos_only.
    shutil.copyfile(models/'bb_jasa.classifier.neg',models/'nattalia_jasa.classifier.neg')

if __name__=='__main__':
    main()

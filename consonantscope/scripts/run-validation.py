#!/usr/bin/env python3
"""One-command fetch, integrity verification, tests and corpus evaluation."""
import argparse, pathlib, subprocess, sys, tempfile

def main():
    parser=argparse.ArgumentParser()
    parser.add_argument('--data',help='Optional existing/download cache; defaults to an external temporary directory')
    parser.add_argument('--output',help='Report directory; defaults to validation/')
    args=parser.parse_args()
    root=pathlib.Path(__file__).resolve().parents[1]
    temporary=None
    if args.data:
        cache=pathlib.Path(args.data).resolve()
    else:
        temporary=tempfile.TemporaryDirectory(prefix='consonantscope-corpus-')
        cache=pathlib.Path(temporary.name)
    output=pathlib.Path(args.output).resolve() if args.output else root/'validation'
    try:
        subprocess.run([sys.executable,str(root/'scripts/fetch-corpus.py'),'--data',str(cache)],check=True,cwd=root)
        tests=sorted(str(p) for p in (root/'tests').glob('*.test.cjs'))
        subprocess.run(['node','--test',*tests],check=True,cwd=root)
        subprocess.run(['node',str(root/'scripts/benchmark.cjs'),'--data',str(cache),'--output',str(output)],check=True,cwd=root)
    finally:
        if temporary:
            temporary.cleanup()

if __name__=='__main__':
    main()

#!/usr/bin/env python3
"""Download pinned upstream validation data to a cache; do not redistribute audio."""
import argparse, concurrent.futures, hashlib, json, pathlib, urllib.request

def blob_sha(data):
    return hashlib.sha1(b'blob '+str(len(data)).encode()+b'\0'+data).hexdigest()

def main():
    parser=argparse.ArgumentParser()
    parser.add_argument('--data',required=True)
    args=parser.parse_args()
    root=pathlib.Path(__file__).resolve().parents[1]
    manifest=json.loads((root/'validation/corpus-manifest.json').read_text())
    cache=pathlib.Path(args.data)
    def fetch(entry):
        target=cache/pathlib.Path(entry['path']).parent.name/pathlib.Path(entry['path']).name
        if target.exists() and blob_sha(target.read_bytes())==entry['sha']:
            return
        url=f"https://raw.githubusercontent.com/{manifest['repository']}/{manifest['commit']}/{entry['path']}"
        request=urllib.request.Request(url,headers={'User-Agent':'ConsonantScope-validation/0.1'})
        with urllib.request.urlopen(request,timeout=30) as response:
            data=response.read()
        if blob_sha(data)!=entry['sha']:
            raise ValueError('Upstream content integrity mismatch: '+entry['path'])
        target.parent.mkdir(parents=True,exist_ok=True)
        temp=target.with_suffix(target.suffix+'.tmp')
        temp.write_bytes(data)
        temp.replace(target)
    with concurrent.futures.ThreadPoolExecutor(max_workers=6) as pool:
        list(pool.map(fetch,manifest['files']))
    print(f"Verified {len(manifest['files'])} pinned files in {cache}")

if __name__=='__main__':
    main()

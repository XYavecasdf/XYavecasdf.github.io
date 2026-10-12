#!/usr/bin/env python3
"""Probe the Hillenbrand corpus archive in a GitHub runner.
Writes *metadata only*, never raw audio. Intended to establish parse schema."""
import io,json,os,urllib.request,zipfile
from pathlib import Path
URL="https://raw.githubusercontent.com/santiagobarreda/hillenbrand_et_al_1995/main/h95-alldata.zip"
def main():
    req=urllib.request.Request(URL,headers={"User-Agent":"VowelScope-Acoustic-Validation/0.1"})
    with urllib.request.urlopen(req,timeout=90) as resp:
        data=resp.read(40_000_000)
    with zipfile.ZipFile(io.BytesIO(data)) as outer:
        names=outer.namelist()
        result={"status":"archive-inspected","source_url":URL,"archive_bytes":len(data),"file_count":len(names),"files":names[:50],"metadata":{},"nested_wavs":{}}
        for name in names:
            basename=name.rsplit("/",1)[-1].lower()
            if basename in ("vowdata.dat","bigdata.dat","timedata.dat"):
                decoded=outer.read(name).decode("latin1")
                lines=decoded.splitlines()
                result["metadata"][basename]={"name":name,"line_count":len(lines),"first_lines":lines[:38],"last_lines":lines[-2:]}
            if basename.endswith(".zip"):
                with zipfile.ZipFile(io.BytesIO(outer.read(name))) as nested:
                    arr=nested.namelist()
                    result["nested_wavs"][basename]={"count":len(arr),"examples":arr[:10]}
    if "vowdata.dat" not in result["metadata"] or "timedata.dat" not in result["metadata"]:
        raise RuntimeError("Archive does not contain expected annotated data files")
    out=Path("vowelscope/validation/public-dataset/probe.json")
    out.parent.mkdir(parents=True,exist_ok=True)
    out.write_text(json.dumps(result,indent=2,ensure_ascii=False)+"\n",encoding="utf-8")
    print("Archive probe succeeded:",len(data),"bytes; metadata:",list(result["metadata"]))
if __name__=="__main__":main()

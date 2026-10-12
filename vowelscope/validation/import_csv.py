#!/usr/bin/env python3
"""Map locally obtained, licensed speech corpus metadata into VowelScope's
evaluation manifest. No audio is downloaded, uploaded, or mirrored."""
import argparse
import csv
import hashlib
import json
from pathlib import Path

def main():
    p=argparse.ArgumentParser(description="Import a corpus CSV into a VowelScope benchmark manifest")
    p.add_argument("--metadata",required=True,help="CSV file containing source dataset labels and times")
    p.add_argument("--mapping",required=True,help="JSON mapping for source column names and IPA labels")
    p.add_argument("--audio-root",required=True,help="Local directory containing converted WAV files")
    p.add_argument("--out",required=True,help="Manifest output; should be next to or above audio-root")
    p.add_argument("--strict",action="store_true",help="Fail rather than skip incomplete/bad rows")
    args=p.parse_args()
    metadata=Path(args.metadata).resolve()
    mapping=json.loads(Path(args.mapping).read_text(encoding="utf-8"))
    audio_root=Path(args.audio_root).resolve()
    out=Path(args.out).resolve()
    base=out.parent
    if not metadata.is_file() or not audio_root.is_dir():
        p.error("Metadata CSV or audio root missing")
    columns=mapping.get("columns",{})
    for field in ("audio_path","vowel_ipa","start_s","end_s","speaker_id"):
        if field not in columns:
            p.error("Mapping must specify the column: "+field)
    labels=mapping.get("vowel_map",{})
    samples=[]
    skipped={}
    speakers={}
    def skip(reason):
        skipped[reason]=skipped.get(reason,0)+1
        if args.strict: raise ValueError(reason)
    def get(row,key,default=""):
        src=columns.get(key)
        return row.get(src,default) if src else default
    def split_for(speaker):
        # Deterministic speaker-disjoint 70/15/15 split.
        if speaker not in speakers:
            bucket=int(hashlib.sha256(speaker.encode()).hexdigest()[:8],16)%100
            speakers[speaker]="train" if bucket<70 else "dev" if bucket<85 else "test"
        return speakers[speaker]
    with metadata.open(encoding="utf-8-sig",newline="") as stream:
        for n,row in enumerate(csv.DictReader(stream),start=2):
            try:
                original=str(get(row,"audio_path")).strip()
                if not original: raise ValueError("missing audio filename")
                wav=(audio_root/original).resolve()
                if not wav.is_relative_to(audio_root) or wav.suffix.lower()!=".wav" or not wav.is_file():
                    raise ValueError("missing/invalid WAV file")
                if not wav.is_relative_to(base):
                    raise ValueError("audio must be inside the manifest's parent directory")
                t0=float(get(row,"start_s"));t1=float(get(row,"end_s"))
                if t0<0 or t1<=t0: raise ValueError("bad annotated time span")
                speaker=str(get(row,"speaker_id")).strip()
                if not speaker: raise ValueError("missing speaker_id")
                raw_label=str(get(row,"vowel_ipa")).strip()
                ipa=labels.get(raw_label,raw_label)
                if not ipa: raise ValueError("missing vowel label")
                item={"audio_path":wav.relative_to(base).as_posix(),
                    "speaker_id":speaker,"language":str(get(row,"language",mapping.get("language",""))).strip() or mapping.get("language",""),
                    "vowel_ipa":ipa,"start_s":t0,"end_s":t1,
                    "split":str(get(row,"split")).strip() or split_for(speaker),
                    "source":mapping.get("source","unknown")}
                for field in ("gt_time_s","gt_f1_hz","gt_f2_hz","gt_f3_hz"):
                    v=str(get(row,field)).strip()
                    if v:
                        num=float(v)
                        if num<=0: raise ValueError("invalid "+field)
                        item[field]=num
                if "gt_time_s" in item and not (t0<=item["gt_time_s"]<=t1):
                    raise ValueError("reference time is outside the vowel interval")
                samples.append(item)
            except (ValueError,KeyError) as exc:
                skip("row "+str(n)+": "+str(exc))
    if not samples: raise SystemExit("No usable rows; no manifest created.")
    result={"schema_version":1,
        "source":mapping.get("source","unknown"),"source_url":mapping.get("source_url",""),
        "version":mapping.get("version","unspecified"),"licensing_note":mapping.get("licensing_note",""),
        "annotation_provenance":mapping.get("annotation_provenance",""),
        "notes":"Audio remains local. Rows may contain acoustically verified ground truth or labels only; report separates them.",
        "samples":samples}
    out.parent.mkdir(parents=True,exist_ok=True)
    out.write_text(json.dumps(result,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
    print(f"Imported {len(samples)} vowels from {len(speakers)} unique speakers; skipped {sum(skipped.values())}.")
    print(f"Manifest: {out}")
    for reason,count in list(skipped.items())[:10]:print(f"  {count} skipped: {reason}")

if __name__=="__main__":
    main()

#!/usr/bin/env python3
"""Attach audited source links to CMU-derived IPA entries.

Only entries whose pronunciation was independently cross-checked in the
2026-11-19 audit are changed.  The original CMU provenance is preserved in the
source text; the added URL points to the dictionary used for the cross-check.

Usage:
    python tools/apply_audit_sources.py [--check]
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()

    audit = json.loads((ROOT / "audit.json").read_text(encoding="utf-8"))
    lex_path = ROOT / "lexicon.json"
    data = json.loads(lex_path.read_text(encoding="utf-8"))
    lex = data["lexicon"]
    changes = []
    for record in audit["records"]:
        word = record["word"]
        entry = lex.get(word)
        if not entry or not str(entry.get("ipa_source", "")).startswith("CMU"):
            continue
        if record["ipa_status"] != "VERIFIED":
            continue
        sources = record.get("ipa_sources") or []
        preferred = next((s for s in sources if "Cambridge" in s.get("name", "")), None)
        preferred = preferred or next((s for s in sources if "Wiktionary" in s.get("name", "")), None)
        if not preferred or not preferred.get("url"):
            continue
        label = "Cambridge Dictionary" if "Cambridge" in preferred["name"] else "Wiktionary"
        entry["ipa_source"] = f"CMU 转写；2026-11-19 与 {label} 交叉核对一致（宽式）"
        entry["ipa_url"] = preferred["url"]
        changes.append((word, label, preferred["url"]))

    print(f"{len(changes)} CMU entries receive an audited source link")
    for word, label, url in changes[:10]:
        print(f"  {word}: {label} {url}")
    if args.check:
        return 0
    if changes:
        lex_path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        print(f"wrote {lex_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

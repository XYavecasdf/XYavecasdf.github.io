#!/usr/bin/env python3
"""Apply the curated 2026-11-19 corrections to lexicon.json.

The manifest records the expected pre-change IPA for every pronunciation
correction.  If the current value does not match, the script aborts instead of
silently overwriting newer data.  Root additions are idempotent.

Usage:
    python tools/apply_corrections.py [--check]
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--check", action="store_true")
    parser.add_argument("--manifest", default=HERE / "corrections-20261119.json", type=Path)
    args = parser.parse_args()

    manifest = json.loads(args.manifest.read_text(encoding="utf-8"))
    lexicon_path = ROOT / "lexicon.json"
    data = json.loads(lexicon_path.read_text(encoding="utf-8"))
    lex = data["lexicon"]
    changes: list[str] = []

    def canonical_ipa(value: str) -> str:
        return value.replace("r", "ɹ").replace("g", "ɡ")

    for word, change in manifest.get("ipa", {}).items():
        if word not in lex:
            print(f"ERROR: IPA correction for unknown word {word!r}", file=sys.stderr)
            return 1
        current = lex[word]["ipa"]
        new_value = canonical_ipa(change["new"])
        if canonical_ipa(current) == new_value:
            continue
        if canonical_ipa(current) != canonical_ipa(change["old"]):
            print(
                f"ERROR: {word}: expected {change['old']!r} but found {current!r}; refusing to overwrite",
                file=sys.stderr,
            )
            return 1
        lex[word]["ipa"] = new_value
        lex[word]["ipa_source"] = change["source"] + "（2026-11-19 复核）"
        lex[word]["ipa_url"] = change["url"]
        changes.append(f"IPA {word}: {change['old']} -> {change['new']} ({change['source']})")

    for word, change in manifest.get("roots", {}).items():
        if word not in lex:
            print(f"ERROR: root correction for unknown word {word!r}", file=sys.stderr)
            return 1
        entry = lex[word]
        before = [r["term"] for r in entry["roots"]]
        entry["roots"] = [r for r in entry["roots"] if r["term"] not in set(change.get("remove", []))]
        existing = {r["term"] for r in entry["roots"]}
        for addition in change.get("add", []):
            if addition["term"] not in existing:
                entry["roots"].append(dict(addition))
                existing.add(addition["term"])
        after = [r["term"] for r in entry["roots"]]
        if before != after:
            changes.append(f"ROOTS {word}: {before} -> {after}")
        note = change.get("note")
        if note:
            existing_note = entry.get("origin_note") or ""
            if note not in existing_note:
                entry["origin_note"] = (existing_note + " " + note).strip() if existing_note else note

    for key, value in manifest.get("metadata", {}).items():
        if data["metadata"].get(key) != value:
            data["metadata"][key] = value
            changes.append(f"METADATA {key} updated")

    print(f"{len(changes)} changes")
    for line in changes:
        print("  " + line)
    if args.check:
        print("check mode: no files written")
        return 0
    if not changes:
        print("nothing to do")
        return 0

    lexicon_path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"wrote {lexicon_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

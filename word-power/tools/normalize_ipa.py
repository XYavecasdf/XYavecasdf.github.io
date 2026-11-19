#!/usr/bin/env python3
"""Normalize IPA symbols used by Word Power without changing pronunciation.

* ASCII r -> ɹ (voiced alveolar approximant)
* ASCII g -> ɡ (IPA script g)
* collapse repeated spaces inside the transcription

Usage:
    python tools/normalize_ipa.py [--check]
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

    path = ROOT / "lexicon.json"
    data = json.loads(path.read_text(encoding="utf-8"))
    changes = []
    for word, entry in data["lexicon"].items():
        ipa = entry.get("ipa", "")
        new = ipa.replace("r", "ɹ").replace("g", "ɡ")
        new = " ".join(new.split())
        if new != ipa:
            changes.append((word, ipa, new))
            entry["ipa"] = new

    # Source links that were cited without a direct URL.
    for word in ("anthropology", "misanthropy"):
        entry = data["lexicon"].get(word)
        if entry and not entry.get("ipa_url"):
            entry["ipa_url"] = entry["wiktionary_url"]
            changes.append((word, entry["ipa_source"], entry["ipa_source"] + "（2026-11-19 补链接）"))
            entry["ipa_source"] = entry["ipa_source"] + "（2026-11-19 补链接）"

    print(f"{len(changes)} normalization changes")
    for word, old, new in changes[:20]:
        print(f"  {word}: {old} -> {new}")
    if args.check:
        return 0
    if changes:
        path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        print(f"wrote {path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

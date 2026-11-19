#!/usr/bin/env python3
"""Synchronize the offline fallback JSON inside word-power/index.html.

The page loads ./lexicon.json when served over HTTP and falls back to the
embedded <script id="word-data"> block for file:// use.  Keeping both copies in
sync is part of the release contract.  This tool performs a deterministic,
minimal replacement of only that script block.

Usage:
    python tools/sync_embedded.py [--root ..] [--check]
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path

PATTERN = re.compile(
    r'(<script id="word-data" type="application/json">)(.*?)(</script>)',
    re.S,
)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--root", default=Path(__file__).resolve().parents[1], type=Path)
    parser.add_argument("--check", action="store_true", help="only verify, do not write")
    args = parser.parse_args()

    root: Path = args.root
    lexicon = json.loads((root / "lexicon.json").read_text(encoding="utf-8"))
    html_path = root / "index.html"
    html = html_path.read_text(encoding="utf-8")
    match = PATTERN.search(html)
    if not match:
        print("ERROR: embedded word-data script not found", file=sys.stderr)
        return 1

    payload = json.dumps(lexicon, ensure_ascii=False, indent=2)
    current = match.group(2)
    try:
        same = json.loads(current) == lexicon
    except json.JSONDecodeError:
        same = False

    if args.check:
        print("OK: embedded JSON matches lexicon.json" if same else "DIFF: embedded JSON is stale")
        return 0 if same else 1

    if same:
        print("OK: embedded JSON already synchronized")
        return 0

    new_html = html[:match.start(2)] + payload + html[match.end(2):]
    html_path.write_text(new_html, encoding="utf-8")
    print(f"updated {html_path} ({len(html)} -> {len(new_html)} bytes)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

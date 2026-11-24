#!/usr/bin/env python3
"""Structural validation for the Word Power lexicon.

This script is intentionally dependency-free so it can run in CI and in a
plain Python installation.  It validates the JSON contract used by
word-power/index.html and, when present, the machine-readable audit records.

Usage:
    python tools/validate_lexicon.py [--root ..] [--strict] [--json]

Exit status:
    0  no errors (warnings may still be reported)
    1  at least one error
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from collections import Counter
from pathlib import Path
from urllib.parse import unquote, urlparse

REQUIRED_TOP = ("metadata", "groups", "lexicon")
REQUIRED_ENTRY = (
    "word", "zh", "ipa", "ipa_source", "components", "component_status",
    "roots", "book_pages", "wiktionary_url", "source_status", "origin_note",
)
IPA_ALLOWED = set("abdefhijklmnoprstuvwzæŋɑɔəɚɛɝɡɪɹɾʃʊʌʒˈˌ͡θðɜɒ .ː")
# Origin labels include named sources, which are not productive morphemes.
LANGUAGES = {"古希腊语", "拉丁语", "法语", "古英语", "德语", "意大利语", "西班牙语", "人名", "地名"}


class Report:
    def __init__(self) -> None:
        self.errors: list[str] = []
        self.warnings: list[str] = []
        self.metrics: dict[str, object] = {}

    def error(self, msg: str) -> None:
        self.errors.append(msg)

    def warn(self, msg: str) -> None:
        self.warnings.append(msg)


def load_json(path: Path) -> object:
    with path.open(encoding="utf-8") as fh:
        return json.load(fh)


def extract_embedded(html: str) -> dict:
    match = re.search(
        r'<script id="word-data" type="application/json">(.*?)</script>',
        html,
        re.S,
    )
    if not match:
        raise ValueError("embedded word-data script not found")
    return json.loads(match.group(1))


def is_known_language(lang: str) -> bool:
    return any(lang.startswith(base) for base in LANGUAGES)


def check_url(report: Report, word: str, url: str, field: str) -> None:
    parsed = urlparse(url)
    if parsed.scheme != "https" or not parsed.netloc:
        report.error(f"{word}: {field} is not an absolute https URL: {url!r}")
    if field == "wiktionary_url":
        if parsed.netloc != "en.wiktionary.org" or not parsed.path.startswith("/wiki/"):
            report.error(f"{word}: wiktionary_url is not an English Wiktionary entry: {url}")
        else:
            title = unquote(parsed.path[len("/wiki/"):]).replace("_", " ")
            if title.casefold() != word.casefold():
                report.error(f"{word}: wiktionary_url title {title!r} does not match entry")
    if field == "ipa_url" and " " in url:
        report.warn(f"{word}: ipa_url contains a space: {url}")


def check_ipa(report: Report, word: str, ipa: str) -> None:
    if not ipa:
        report.error(f"{word}: missing IPA")
        return
    if not (ipa.startswith("/") and ipa.endswith("/")) or len(ipa) < 4:
        report.error(f"{word}: IPA must be enclosed in slashes: {ipa!r}")
        return
    body = ipa[1:-1]
    if not body.strip():
        report.error(f"{word}: empty IPA body")
    if "  " in body or body != body.strip():
        report.error(f"{word}: whitespace defect in IPA: {ipa!r}")
    unknown = sorted({c for c in body if c not in IPA_ALLOWED and c not in "()"})
    if unknown:
        report.warn(f"{word}: unusual IPA characters {unknown!r} in {ipa!r}")
    if body.count("ˈ") != 1:
        report.error(f"{word}: expected exactly one primary stress in {ipa!r}")
    if "ˌˈ" in body or "ˈˌ" in body:
        report.error(f"{word}: adjacent stress marks in {ipa!r}")
    if "r" in body:
        report.metrics["ascii_r"] = int(report.metrics.get("ascii_r", 0)) + 1


def validate(data: dict, report: Report) -> None:
    if not isinstance(data, dict):
        report.error("top-level JSON value must be an object")
        return
    for key in REQUIRED_TOP:
        if key not in data:
            report.error(f"missing top-level key: {key}")
    if any(k not in data for k in REQUIRED_TOP):
        return

    metadata, groups, lexicon = data["metadata"], data["groups"], data["lexicon"]
    if not isinstance(metadata, dict):
        report.error("metadata must be an object")
        metadata = {}
    if not isinstance(groups, list) or not groups:
        report.error("groups must be a non-empty array")
        groups = []
    if not isinstance(lexicon, dict) or not lexicon:
        report.error("lexicon must be a non-empty object")
        lexicon = {}

    if len(lexicon) != metadata.get("unique_words"):
        report.error(
            f"metadata.unique_words={metadata.get('unique_words')} but lexicon has {len(lexicon)}"
        )

    root_terms: list[str] = []
    word_instances = 0
    group_word_membership: dict[str, int] = Counter()
    for gi, group in enumerate(groups):
        if not isinstance(group, dict):
            report.error(f"group[{gi}] is not an object")
            continue
        if not group.get("name"):
            report.error(f"group[{gi}] has no name")
        roots = group.get("roots")
        if not isinstance(roots, list) or not roots:
            report.error(f"group[{gi}] has no roots")
            continue
        for ri, root in enumerate(roots):
            if not isinstance(root, dict):
                report.error(f"group[{gi}].roots[{ri}] is not an object")
                continue
            term = root.get("term")
            if not term:
                report.error(f"group[{gi}].roots[{ri}] has no term")
            else:
                root_terms.append(term)
            for field in ("zh", "lang"):
                if not root.get(field):
                    report.error(f"root {term!r}: missing {field}")
            if not is_known_language(str(root.get("lang", ""))):
                report.warn(f"root {term!r}: unusual language {root.get('lang')!r}")
            words = root.get("words")
            if not isinstance(words, list) or not words:
                report.error(f"root {term!r}: missing words")
                continue
            if len(words) != len(set(words)):
                report.error(f"root {term!r}: duplicate words")
            for word in words:
                word_instances += 1
                group_word_membership[word] += 1
                if word not in lexicon:
                    report.error(f"root {term!r}: word {word!r} is absent from lexicon")

    if len(set(root_terms)) != metadata.get("roots"):
        report.error(
            f"metadata.roots={metadata.get('roots')} but {len(set(root_terms))} unique root terms exist"
        )
    if word_instances != metadata.get("word_instances"):
        report.error(
            f"metadata.word_instances={metadata.get('word_instances')} but {word_instances} word links exist"
        )
    if len(root_terms) != len(set(root_terms)):
        duplicates = [t for t, n in Counter(root_terms).items() if n > 1]
        report.warn(f"root terms occur in more than one group: {duplicates}")

    for word, entry in lexicon.items():
        if not isinstance(entry, dict):
            report.error(f"{word}: entry is not an object")
            continue
        if entry.get("word") != word:
            report.error(f"{word}: entry.word is {entry.get('word')!r}")
        for field in REQUIRED_ENTRY:
            if field not in entry:
                report.error(f"{word}: missing field {field}")
        if not str(entry.get("zh", "")).strip():
            report.error(f"{word}: missing Chinese definition")
        elif not re.search(r"[\u4e00-\u9fff]", entry["zh"]):
            report.error(f"{word}: Chinese definition has no Han characters")
        if not str(entry.get("ipa_source", "")).strip():
            report.error(f"{word}: missing ipa_source")
        if not str(entry.get("component_status", "")).strip():
            report.error(f"{word}: missing component_status")
        check_ipa(report, word, str(entry.get("ipa", "")))
        components = entry.get("components")
        if not isinstance(components, list):
            report.error(f"{word}: components must be an array")
        else:
            for ci, comp in enumerate(components):
                if not isinstance(comp, dict) or not comp.get("form") or not comp.get("zh"):
                    report.error(f"{word}: components[{ci}] needs non-empty form and zh")
        roots = entry.get("roots")
        if not isinstance(roots, list):
            report.error(f"{word}: roots must be an array")
        else:
            for ri, root in enumerate(roots):
                if not isinstance(root, dict) or not root.get("term") or not root.get("zh") or not root.get("lang"):
                    report.error(f"{word}: roots[{ri}] needs term, zh and lang")
                elif not is_known_language(str(root.get("lang", ""))):
                    report.warn(f"{word}: roots[{ri}] unusual language {root.get('lang')!r}")
        pages = entry.get("book_pages")
        if not isinstance(pages, list) or any(not isinstance(p, int) for p in pages):
            report.error(f"{word}: book_pages must be an array of integers")
        for field in ("wiktionary_url", "ipa_url"):
            url = entry.get(field)
            if url:
                check_url(report, word, str(url), field)
        if not entry.get("wiktionary_url"):
            report.error(f"{word}: missing wiktionary_url")
        source = str(entry.get("ipa_source", "")).strip()
        if source.startswith("Wiktionary") and not entry.get("ipa_url"):
            report.warn(f"{word}: ipa_source starts with Wiktionary but ipa_url is absent")
        if word not in group_word_membership:
            report.error(f"{word}: entry is not linked from any group")

    for word in group_word_membership:
        if word not in lexicon:
            report.error(f"group word {word!r} has no lexicon entry")

    if report.metrics.get("ascii_r"):
        report.warn(f"{report.metrics['ascii_r']} entries use ASCII r instead of ɹ (transcription consistency)")
    report.metrics = {
        "entries": len(lexicon),
        "groups": len(groups),
        "unique_root_terms": len(set(root_terms)),
        "root_instances": len(root_terms),
        "word_instances": word_instances,
        "ipa_sources": len([e for e in lexicon.values() if e.get("ipa_url")]),
        "entries_with_ipa": len([e for e in lexicon.values() if e.get("ipa")]),
        "entries_with_components": len([e for e in lexicon.values() if e.get("components")]),
    }


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--root", default=Path(__file__).resolve().parents[1], type=Path)
    parser.add_argument("--json", action="store_true", help="print a JSON report")
    parser.add_argument("--strict", action="store_true", help="treat warnings as errors")
    args = parser.parse_args()

    root: Path = args.root
    lexicon_path = root / "lexicon.json"
    html_path = root / "index.html"
    report = Report()

    try:
        data = load_json(lexicon_path)
        html = html_path.read_text(encoding="utf-8")
        embedded = extract_embedded(html)
    except Exception as exc:  # noqa: BLE001 - report parse failures as validation errors
        print(f"FATAL: {exc}", file=sys.stderr)
        return 1

    validate(data, report)
    if embedded != data:
        report.error("embedded word-data JSON differs from lexicon.json")
    else:
        report.metrics["embedded_matches_external"] = True

    audit_path = root / "audit.json"
    if audit_path.exists():
        try:
            audit = load_json(audit_path)
            records = audit.get("records") if isinstance(audit, dict) else audit
            if not isinstance(records, list):
                report.error("audit.json must contain a records array")
            else:
                audit_words = [r.get("word") for r in records if isinstance(r, dict)]
                if len(audit_words) != len(set(audit_words)):
                    report.error("audit.json contains duplicate words")
                missing = sorted(set(data.get("lexicon", {})) - set(audit_words))
                extra = sorted(set(audit_words) - set(data.get("lexicon", {})))
                if missing:
                    report.error(f"audit.json misses {len(missing)} lexicon entries: {missing[:5]}")
                if extra:
                    report.error(f"audit.json has unknown entries: {extra[:5]}")
                report.metrics["audit_records"] = len(audit_words)
        except Exception as exc:  # noqa: BLE001
            report.error(f"audit.json is invalid: {exc}")

    if args.strict and report.warnings:
        report.errors.extend(f"strict: {w}" for w in report.warnings)

    if args.json:
        print(json.dumps({
            "ok": not report.errors,
            "metrics": report.metrics,
            "errors": report.errors,
            "warnings": report.warnings,
        }, ensure_ascii=False, indent=2))
    else:
        print(f"entries={report.metrics.get('entries')} groups={report.metrics.get('groups')} "
              f"unique_roots={report.metrics.get('unique_root_terms')} "
              f"word_instances={report.metrics.get('word_instances')} "
              f"ipa_urls={report.metrics.get('ipa_sources')}")
        for msg in report.errors:
            print(f"ERROR: {msg}")
        for msg in report.warnings:
            print(f"WARN:  {msg}")
        print(f"RESULT: {'PASS' if not report.errors else 'FAIL'} "
              f"({len(report.errors)} errors, {len(report.warnings)} warnings)")
    return 0 if not report.errors else 1


if __name__ == "__main__":
    raise SystemExit(main())

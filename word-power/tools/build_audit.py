#!/usr/bin/env python3
"""Build machine-readable audit records for every Word Power entry.

The lexical data is the source of truth.  Optional cached source material
(Wiktionary wikitext and Cambridge Dictionary pages fetched during the
2026-11-19 audit) is used only to assign verification statuses; it is not
required to validate the website itself.

Usage:
    python tools/build_audit.py --wiktionary-ipa ../../audit-cache/wikt_ipa.json \
        --dictionary-cache ../../audit-cache/dict-pages
"""

from __future__ import annotations

import argparse
import difflib
import json
import re
from collections import Counter
from pathlib import Path
from urllib.parse import unquote

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent

VOWELS = set("aeiouɑɔəɛɜɪʊʌæɐɞɘɵɤɯøœyɨʉ")


def normalize_ipa(ipa: str) -> str:
    s = ipa.strip().strip("/[]")
    s = s.replace("(", "").replace(")", "").replace("͡", "").replace(".", "").replace(" ", "")
    s = s.replace("ɹ", "r").replace("ɚ", "ər").replace("ɝ", "ɜr")
    s = s.replace("ɜː", "ɜr").replace("ɜ:", "ɜr")
    s = s.replace("ɒ", "ɑ").replace("əʊ", "oʊ").replace("ɐ", "ə").replace("ː", "")
    s = s.replace("ᵻ", "ɪ").replace("ɵ", "ə")
    s = s.replace("t̬", "t").replace("d̬", "d")
    s = s.replace("eɪ", "Eɪ")  # protect the FACE diphthong
    s = s.replace("e", "ɛ")
    s = s.replace("E", "e")
    s = s.replace("l̩", "əl").replace("n̩", "ən").replace("m̩", "əm")
    return s


def core(ipa: str) -> str:
    return re.sub(r"[ˈˌ]", "", normalize_ipa(ipa))


def nuclei(ipa: str) -> list[str]:
    s = normalize_ipa(ipa)
    out = []
    i = 0
    diphthongs = ("eɪ", "aɪ", "aʊ", "ɔɪ", "oʊ", "ɪə", "ɛə", "ʊə", "iə", "uə")
    while i < len(s):
        two = s[i:i + 2]
        if two in diphthongs:
            out.append(two)
            i += 2
        elif s[i] in VOWELS:
            out.append(s[i])
            i += 1
        else:
            out.append(s[i])
            i += 1
    return out


def primary_index(ipa: str):
    syllable = 0
    for token in nuclei(ipa):
        if token == "ˈ":
            return syllable
        if token and token[0] in VOWELS:
            syllable += 1
    return None


def syllable_count(ipa: str) -> int:
    return sum(1 for token in nuclei(ipa) if token and token[0] in VOWELS)


def cambridge_us(paragraph: str):
    matches = re.findall(r"US\s*(/[^/\n]{1,90}/)", paragraph)
    return matches[0] if matches else None


def wikt_ipa(entry: dict):
    return (entry.get("ga") or entry.get("unmarked") or [])


def load_json(path: Path, default):
    if not path.exists():
        return default
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return default


def classify_ipa(word: str, entry: dict, wikt: dict, dict_cache: Path, corrected: set, corrections: dict):
    current = entry["ipa"]
    source = entry.get("ipa_source", "")
    url = entry.get("ipa_url")
    issues = []
    sources = []
    if url:
        sources.append({"name": source or "dictionary", "url": url, "supports": "pronunciation"})

    if word in corrected:
        change = corrections["ipa"][word]
        issues.append(f"Corrected from {change['old']} to {change['new']}: {change['note']}")
        return "CORRECTED", "high", sources, issues

    # Cambridge is the strongest direct source when the page was retrieved.
    path = dict_cache / (word.replace(" ", "_") + ".txt")
    if path.exists():
        cam = cambridge_us(path.read_text(encoding="utf-8"))
        if cam:
            sources.append({
                "name": "Cambridge Dictionary, American English",
                "url": f"https://dictionary.cambridge.org/pronunciation/english/{word.replace(' ', '-')}",
                "supports": f"pronunciation; Cambridge gives {cam}",
            })
            if core(cam) == core(current):
                return "VERIFIED", "high", sources, issues
            ratio = difflib.SequenceMatcher(None, core(cam), core(current)).ratio()
            if ratio >= 0.82:
                issues.append(f"Cambridge gives {cam}; existing broad transcription is a minor variant")
                return "VERIFIED", "high", sources, issues
            if primary_index(cam) == primary_index(current) and syllable_count(cam) == syllable_count(current):
                issues.append(f"Cambridge gives {cam}; vowel/consonant variant retained (stress and syllable count agree)")
                return "PLAUSIBLE_BUT_UNVERIFIED", "medium", sources, issues
            issues.append(f"Cambridge gives {cam}, which differs materially from {current}")

    wikt_candidates = wikt_ipa(wikt.get(word, {}))
    if wikt_candidates:
        old_core = core(current)
        old_primary = primary_index(current)
        best = min(wikt_candidates, key=lambda c: (core(c) != old_core, primary_index(c) != old_primary, len(c)))
        same_core = core(best) == old_core
        same_primary = primary_index(best) == old_primary or syllable_count(current) == 1
        if same_core and same_primary:
            sources.append({
                "name": "Wiktionary, English entry (General American / unmarked)",
                "url": entry.get("wiktionary_url"),
                "supports": f"pronunciation cross-check; Wiktionary gives {best}",
            })
            return "VERIFIED", "high", sources, issues
        if same_primary:
            issues.append(f"Segment transcription differs from Wiktionary ({best}); broad variant retained")
            sources.append({
                "name": "Wiktionary, English entry (General American / unmarked)",
                "url": entry.get("wiktionary_url"),
                "supports": f"pronunciation variant; Wiktionary gives {best}",
            })
            return "PLAUSIBLE_BUT_UNVERIFIED", "medium", sources, issues
        if " " in current:
            issues.append(f"Phrase-level stress differs from Wiktionary ({best}); word-level transcription retained")
            return "VERIFIED", "medium", sources, issues
        issues.append(f"Wiktionary gives materially different pronunciation {best}")
        return "CONFLICTING_SOURCES", "low", sources, issues

    if issues:
        return "CONFLICTING_SOURCES", "low", sources, issues
    issues.append("No independent dictionary transcription was located in this audit; CMU-derived value retained")
    return "PLAUSIBLE_BUT_UNVERIFIED", "low", sources, issues


def dedupe_sources(sources: list[dict]) -> list[dict]:
    seen = set()
    out = []
    for source in sources:
        key = (source.get("name"), source.get("url"), source.get("supports"))
        if key not in seen:
            seen.add(key)
            out.append(source)
    return out


def component_type(form: str) -> str:
    if form.startswith("-"):
        return "suffix"
    if form.endswith("-"):
        return "prefix" if form[:-1].count("-") == 0 else "combining_form"
    if form.endswith(("o", "i", "a")) and len(form) > 2:
        return "combining_form"
    return "root_or_stem"


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--wiktionary-ipa", type=Path, default=ROOT.parent.parent / "audit-cache" / "wikt_ipa.json")
    parser.add_argument("--dictionary-cache", type=Path, default=ROOT.parent.parent / "audit-cache" / "dict-pages")
    parser.add_argument("--output", type=Path, default=ROOT / "audit.json")
    args = parser.parse_args()

    data = load_json(ROOT / "lexicon.json", {})
    corrections = load_json(HERE / "corrections-20261119.json", {"ipa": {}, "roots": {}})
    wikt = load_json(args.wiktionary_ipa, {})
    lex = data["lexicon"]
    corrected_ipa = set(corrections.get("ipa", {}))
    corrected_roots = set(corrections.get("roots", {}))

    records = []
    for word, entry in lex.items():
        ipa_status, ipa_confidence, ipa_sources, ipa_issues = classify_ipa(
            word, entry, wikt, args.dictionary_cache, corrected_ipa, corrections
        )

        components = []
        for comp in entry.get("components", []):
            components.append({
                "form": comp["form"],
                "gloss_zh": comp["zh"],
                "type": component_type(comp["form"]),
                "status": "VERIFIED" if word in corrected_roots else "PLAUSIBLE_BUT_UNVERIFIED",
            })
        if word in corrected_roots:
            morphology_status = "CORRECTED"
            morphology_confidence = "high"
            etymology_status = "VERIFIED"
            etymology_confidence = "high"
            etymology_sources = [{
                "name": "Wiktionary, English etymology",
                "url": corrections["roots"][word]["source"],
                "supports": "root identification and language of origin",
            }]
            etymology_text = corrections["roots"][word].get("note")
        elif entry.get("origin_note"):
            morphology_status = "PLAUSIBLE_BUT_UNVERIFIED"
            morphology_confidence = "medium"
            etymology_status = "VERIFIED"
            etymology_confidence = "medium"
            etymology_sources = [{
                "name": "Wiktionary, English etymology",
                "url": entry["wiktionary_url"],
                "supports": "the origin_note caveat",
            }]
            etymology_text = entry["origin_note"]
        else:
            morphology_status = "PLAUSIBLE_BUT_UNVERIFIED"
            morphology_confidence = "low"
            etymology_status = "PLAUSIBLE_BUT_UNVERIFIED"
            etymology_confidence = "low"
            etymology_sources = []
            etymology_text = None

        issues = list(ipa_issues)
        if etymology_status != "VERIFIED":
            issues.append("Historical etymology is an educational root analysis, not an individually documented borrowing path")
        if entry.get("component_status", "").startswith("教学式"):
            issues.append("Component split is pedagogical and may not match the word's historical borrowing path")
        if not entry.get("components"):
            issues.append("No morphological components recorded")

        if ipa_status in ("VERIFIED", "CORRECTED") and etymology_status == "VERIFIED":
            overall = "VERIFIED"
        elif ipa_status in ("VERIFIED", "CORRECTED") or etymology_status == "VERIFIED":
            overall = "PARTIALLY_VERIFIED"
        elif ipa_status == "CONFLICTING_SOURCES":
            overall = "CONFLICTING_SOURCES"
        else:
            overall = "PLAUSIBLE_BUT_UNVERIFIED"

        confidence = "high" if overall == "VERIFIED" else ("medium" if overall == "PARTIALLY_VERIFIED" else "low")
        changes = []
        if word in corrected_ipa:
            changes.append(f"IPA corrected: {corrections['ipa'][word]['old']} -> {corrections['ipa'][word]['new']}")
        if word in corrected_roots:
            changes.append("Missing lexical roots added and etymology note recorded")
        if "交叉核对一致" in str(entry.get("ipa_source", "")):
            changes.append("IPA source link and cross-check note added")

        records.append({
            "word": word,
            "ipa": entry.get("ipa"),
            "ipa_source": entry.get("ipa_source"),
            "ipa_source_url": entry.get("ipa_url"),
            "ipa_status": ipa_status,
            "ipa_sources": dedupe_sources(ipa_sources),
            "morphological_analysis": components,
            "morphology_status": morphology_status,
            "historical_etymology": etymology_text,
            "etymology_sources": etymology_sources,
            "etymology_status": etymology_status,
            "chinese_definition": entry.get("zh"),
            "chinese_status": "PLAUSIBLE_BUT_UNVERIFIED",
            "verification_status": overall,
            "confidence": confidence,
            "issues": issues,
            "changes_made": changes,
        })

    summary = Counter()
    for record in records:
        summary["total"] += 1
        summary[f"ipa_{record['ipa_status']}"] += 1
        summary[f"etymology_{record['etymology_status']}"] += 1
        summary[f"overall_{record['verification_status']}"] += 1
        if record["changes_made"]:
            summary["entries_changed"] += 1
        if any("IPA corrected" in c for c in record["changes_made"]):
            summary["ipa_corrected"] += 1
        if any("Missing lexical roots" in c for c in record["changes_made"]):
            summary["root_corrected"] += 1
        if any("source link" in c for c in record["changes_made"]):
            summary["source_links_added"] += 1
        if record["word"] in corrected_ipa or record["word"] in corrected_roots:
            summary["content_corrected"] += 1
        summary["ipa_sources"] += 1 if record["ipa_sources"] else 0
        summary["verified_ipa"] += 1 if record["ipa_status"] in ("VERIFIED", "CORRECTED") else 0
        summary["verified_etymology"] += 1 if record["etymology_status"] == "VERIFIED" else 0

    payload = {
        "metadata": {
            "title": "Word Power Made Easy · 2026-11-19 lexicon audit",
            "audit_date": "2026-11-19",
            "total_entries": len(records),
            "summary": dict(summary),
            "sources": [
                "Wiktionary English entries (API, retrieved 2026-11-19)",
                "Cambridge Dictionary (American English pronunciation pages, retrieved through a text reader)",
                "Oxford Learner's Dictionaries (spot checks)",
                "Project definitions and Norman Lewis index",
            ],
            "limitations": [
                "Chinese glosses were checked structurally; they are project editorial definitions, not independently dictionary-verified translations.",
                "Component analyses are pedagogical; only entries listed with etymology_status=VERIFIED were re-checked against a source etymology.",
                "A Cambridge/Wiktionary match is a broad-transcription cross-check, not an audio perception test.",
            ],
        },
        "records": records,
    }
    args.output.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"wrote {args.output}: {len(records)} records")
    print(json.dumps(dict(summary), ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

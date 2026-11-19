# Word Power data tools

This directory contains the deterministic validation and audit tooling for
`word-power/`. All scripts use only the Python standard library unless noted.

## Data contract

`lexicon.json` has three top-level keys:

- `metadata`: editorial counts and notes. `roots` is the number of **unique**
  root terms; `word_instances` is the number of root-to-word links.
- `groups`: eight semantic groups. Every word in a group must exist in
  `lexicon`.
- `lexicon`: 507 entries keyed by word. Each entry keeps the existing fields
  (`word`, `zh`, `ipa`, `ipa_source`, `components`, `component_status`,
  `roots`, `book_pages`, `wiktionary_url`, `source_status`, `origin_note`,
  optional `ipa_url`). New optional fields are ignored by the page.

`index.html` embeds the same object in
`<script id="word-data" type="application/json">` as an offline fallback.
The page prefers `./lexicon.json` when served over HTTP.

## Commands

Run from `word-power/`:

```sh
# structural checks, metadata counts, IPA format, URL shape, embedded/external sync
python tools/validate_lexicon.py

# machine-readable output
python tools/validate_lexicon.py --json

# only check that embedded JSON is current
python tools/sync_embedded.py --check

# update the embedded fallback after editing lexicon.json
python tools/sync_embedded.py

# re-apply the curated 2026-11-19 corrections (idempotent; refuses mismatches)
python tools/apply_corrections.py

# normalize ASCII r/g to ɹ/ɡ
python tools/normalize_ipa.py

# rebuild audit.json from cached sources (paths point outside this checkout)
python tools/build_audit.py \
  --wiktionary-ipa ../../audit-cache/wikt_ipa.json \
  --dictionary-cache ../../audit-cache/dict-pages

# add audited source links to CMU-derived entries (idempotent)
python tools/apply_audit_sources.py

# real-browser smoke test (requires a local HTTP server and Chrome)
python -m http.server 8765 --bind 127.0.0.1
node tools/browser_test.mjs --url http://127.0.0.1:8765/word-power/
```

`validate_lexicon.py` exits non-zero on structural errors. `--strict` also
turns warnings into errors. The duplicate root terms warning is expected:
the same root (e.g. `philein`) can appear in more than one semantic group.

## Audit provenance

`audit.json` contains one record per entry with:

- `ipa_status`, `ipa_sources`, `ipa_source_url`
- `morphological_analysis`, `morphology_status`
- `historical_etymology`, `etymology_sources`, `etymology_status`
- `chinese_definition`, `chinese_status`
- `verification_status`, `confidence`, `issues`, `changes_made`

Statuses are deliberately conservative. `VERIFIED` pronunciation means the
transcription was either taken from a retrieved dictionary page or
cross-checked against one; it is not an audio-perception test. `CORRECTED`
means a documented error was replaced. `PLAUSIBLE_BUT_UNVERIFIED` means the
existing broad transcription was retained because no independent source
resolved it.

The audit cache (`wiktionary.json`, `wikt_ipa.json`, `dict-pages/`) is kept
outside the public checkout because it contains third-party page text. The
committed `audit.json` records the source URLs and claims, so the website
remains usable without the cache. Re-running `build_audit.py` requires the
cache; without it the script still produces records but cannot refresh the
verification statuses.

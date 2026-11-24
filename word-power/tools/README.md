# Word Power data tools

This directory contains the deterministic validation and audit tooling for
`word-power/`. All scripts use only the Python standard library unless noted.

## Data contract

`lexicon.json` has four top-level keys:

- `metadata`: editorial counts and notes. `roots` is the number of **unique**
  root terms; `word_instances` is the number of root-to-word links.
- `groups`: nine semantic groups (including named origins). Every word in a group must exist in
  `lexicon`.
- `lexicon`: 527 entries keyed by word. Each entry keeps the existing fields
  (`word`, `zh`, `ipa`, `ipa_source`, `components`, `component_status`,
  `roots`, `book_pages`, `wiktionary_url`, `source_status`, `origin_note`,
  optional `ipa_url`). Additional fields are described below.
- `book_stories`: 30 historical anecdotes and origin narratives, linked to 33 entries
  through optional `book_stories` arrays. A word can have multiple stories.
  General explanations, exercises and invented examples remain excluded.
  Legends, reported anecdotes and disputed origin accounts carry explicit labels.
  Each story retains physical PDF pages, reference links and editorial notes.
  `metadata.book_stories.word_count` counts linked entries, not the full lexicon.

Each lexicon entry also has `pronunciation_audio`, an array of up to two
recordings explicitly linked from the English Wiktionary entry. Every clip
includes the Commons URL, file page, speaker/artist credit, accent and license.
Audio is fetched only after a playback click and is not copied into this repo.
The recording index covers 490 of 527 entries. Every entry additionally has
`american_pronunciation`: 276 link to explicitly US-labelled human recordings;
251 ship a local MP3 generated with CMU Flite's US SLT voice. Synthetic audio is
clearly labelled and works without browser voices. The first button is always
the American option; other recorded accents remain additional choices.
The optional browser speech button requests `en-US` and rejects UK/Australian
voices instead of substituting them. See `audio/README.md` for generation and credits.
Playback errors retain the fallback and dictionary link; changing/closing the
word card stops audio. Audio is independent of the IPA transcription source.

`tools/book-stories.tsv` is the curated source: words, PDF page ranges, title,
Chinese narrative, historical status, reference label, reference URL, optional editorial note (tab-separated).
The importer requires the original private PDF to verify word occurrences,
including explicitly listed source forms such as guppies and cantaloupes.
Do not copy an anecdote to unrelated root siblings.

`story-word-additions.json` adds 20 entries from the named-origin material and
the Borden example. Named sources use explicit 人名/地名 origin labels, not
productive-morpheme claims. `audit.json` retains its original dated audit and
adds separately dated supplement records; two inferred IPA forms stay unverified.

`index.html` embeds the same object in
`<script id="word-data" type="application/json">` as an offline fallback.
The page prefers `./lexicon.json` when served over HTTP.

## Commands

Every entry has sourced `parts_of_speech` codes and a revision-pinned
`pos_source_url`. Only English lexical headings are indexed; extra categories
whose senses are all explicitly obsolete/archaic/rare/dated/nonstandard/humorous
are omitted. A sole attested historical category is retained and marked.
Refresh with `python tools/import_parts_of_speech.py --cache /private/cache`,
then synchronize the embedded data and run `tests/check-parts-of-speech.py`.

Run from `word-power/`:

```sh
# reconcile curated additions and verify all story references against the private PDF
python tools/import_story_words.py
python tools/import-book-stories.py /private/path/Word_Power_Made_Easy.pdf
python tools/import_pronunciation_audio.py --cache /path/outside/checkout/audio-cache
python tools/sync_embedded.py

# structural checks, metadata counts, IPA format, URL shape, embedded/external sync
python tools/validate_lexicon.py

# machine-readable output
python tools/validate_lexicon.py --json

# only check that embedded JSON is current
python tools/sync_embedded.py --check

# update the embedded fallback after editing lexicon.json
python tools/sync_embedded.py

# refresh the recording index (network required; keep raw responses private)
python tools/import_pronunciation_audio.py --cache /path/outside/checkout/audio-cache
# or rebuild American coverage from the existing recording index, without network
python tools/american_pronunciation.py
python tools/sync_embedded.py
python tests/check-pronunciation-audio.py
node tests/pronunciation-browser.cjs --url http://127.0.0.1:8765/word-power/
node tests/story-browser.cjs --url http://127.0.0.1:8765/word-power/

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

## Exploration views

The library's **Mind map** entry opens the complete network and lazy-loads
`explore.js`, `explore.css`, `explore-model.js`, `network-global.js` and
same-origin D3/Natural Earth assets. Word cards, POS,
stories and US audio continue to use the library's existing renderer.

`explore-model.js` merges origins by normalized `(language, term)` and creates
only the explicit `groups[].roots[].words` edges. The complete index has 527
words, 257 origins and 686 deduplicated edges. The default **All** view renders
every node and edge; search, selection, hover and zoom never discard nodes.
Labels appear progressively with zoom; overlap checks keep the overview sparse
and account for node positions in detailed views. Roots have
larger dots, while person/place origins retain distinct types and colors.

`network-global.js` packs the actual connected components to seed a deterministic
force layout. Packing adds no semantic edges. Warm-up runs in short animation
frame batches, with the result cached in memory across view changes. The global
view supports node dragging, pan/zoom, neighbor highlighting, search location,
fullscreen (Escape to leave) and double-click to open the shared word card.
The optional **Local** view retains the original neighborhood explorer, with
at most 20 neighbors per expansion and an explicit remaining count.

`places.json` contains eight sourced geographic associations. City coordinates
are approximate references; Egypt uses the basemap country polygon and records
the historical misidentification explicitly. Vendor provenance and licenses are
in `../vendor/README.md`.

Shareable routes use `?view=network` for the full overview,
`?view=network&focus=philanthropy` to locate a node in the full graph, or
`?view=network&scope=local&focus=philanthropy` for a local neighborhood.
Origins use the model's `origin:...` ID. The map uses `?view=map&place=quanzhou`.
Both support the existing `word` parameter for an open card. Returning to the
library retains its in-memory filters, expansion state and scroll position.

```sh
node tests/check-explore-model.cjs
node tests/explore-browser.cjs --url http://127.0.0.1:8765/word-power/
node tests/global-network-browser.cjs --url http://127.0.0.1:8765/word-power/
```

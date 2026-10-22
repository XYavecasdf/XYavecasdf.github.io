# Reference-sound repair — 2026-10-22

User report: many symbols appeared to play mismatched sounds and some did not
play at all. The original production release is `8dd71c5`.

## Findings

- Confirmed coverage failure: the previous player had only 17 exact entries;
  11 controls intentionally had no audio. That did not satisfy the requested
  full reference-vowel experience.
- Code/file inspection did not demonstrate an off-by-one or cross-indexed URL
  bug. Matching a single-character filename was insufficient evidence that its
  performed phonetic quality matched the intended general IPA reference.
- The previous source consisted of creator-labeled examples; no independent
  per-vowel phonetic review had occurred. A technical triage also found some
  full-scale PCM samples, which does not by itself prove a wrong vowel or explain
  the user's particular perceptions. Do not claim a confirmed phonetic relabeling.
- External runtime URLs made audio dependent on another host. Browser testing
  of the previous version intercepted those requests and did not prove live
  delivery on the user's network.

## Change

Replaced the active 17-file source with a complete, explicitly mapped community
IPA collection at `serverhiccups/ipa-chart`, revision
`fc6270c08a8aed6141cbe04595db8801ba767b49`. Its catalog supplies all 28
symbol/name/audio triples. Each is copied into the runtime map by character,
with a distinct Unicode-named file, not an index in visual button order.

The recording-specific CC BY-SA 3.0 statement and collective performer credits
are retained. Original Vorbis recordings stay in an external cache; deliberately
redistributable MP3 teaching derivatives are served by the site with attribution,
license link and conversion notice. Source catalog data retains its own CC BY-SA
4.0 attribution. This distinction avoids treating the site's code license as
permission for all recordings. See [full attribution and provenance](../REFERENCE_AUDIO.md).

The source catalog's rounded=false flags for [ə, ɐ] are not imported into the
articulatory teaching model: those symbols still leave rounding unspecified.
Near-close front labels in the source identify [ɪ, ʏ]; the conventional near-front
category remains in the viewer. No language-specific phone model is inferred.

The HTML versions the player script to avoid stale cached 17-file logic after an
update. The actual-source replay loader now handles URL version queries while
retaining them in provenance digests. DSP itself is unchanged.

## Verification boundaries

Tests cover all 28 exact symbol/catalog/file relationships, derivative file
existence/hashes, actual browser decoding and playback from the built site,
rapid switching, stopping, errors, both locales and microphone interlock.
An unchanged copy of the upstream table is checked against its pinned hash so a
runtime mapping and a locally edited manifest cannot silently agree on a swap.

Verification completed before release:

- 121 Node tests and 39 Python tests passed, alongside bilingual benchmark
  self-tests, Phase 3/3b, syntax/configuration checks and a Jekyll build.
- Real Chromium loaded the built site over HTTP without intercepted audio
  responses. All 28 recordings played to completion in each locale (56 total),
  at playback rate 1; all 28 response hashes per locale matched the inventory.
- Rapid switching and Stop cancelled playback. Reduced motion and 1280/390/320
  pixel layouts passed; no page errors or external runtime requests occurred.
- The built attribution page returned HTTP 200. All bundled MP3s matched the
  recorded hashes; no DSP changes or original OGG recordings were included.
- Fresh independent code review found no Critical or Important issues.

Full browser evidence is retained outside this public checkout under
`/workspace/research-results/sound-repair-20261022-*`. Physical speaker audibility,
real-device microphone capture and expert phonetic listening remain untested.

These checks prove mapped asset coverage and technical playback, not an expert
perceptual audit. The broader allegation that the original source had many
wrong phonetic realizations remains unconfirmed. The replacement uses explicit
community chart mappings, and the interface continues to disclose the absence
of independent expert phonetic certification. Never claim “all sounds certified
correct” from filenames, metadata, automated tests or this replacement alone.

# Articulatory reference viewer and audio attribution

The Chinese and English reference-vowel buttons now select a schematic side-view
tongue/lip animation. Repeated selection replays the same reference; switching
vowels stops the previous recording. Keyboard buttons, pressed state, live playback
status and reduced-motion preferences are supported.

Tongue positions use explicit IPA height/backness/rounding categories for all 28
displayed symbols, not an inversion of microphone F1/F2. The moving contour is a
teaching illustration, not a measured vocal tract, MRI animation or a unique
articulatory solution. The symbols [ə, ɐ] do not specify rounding here: the
illustration hides a fixed lip contour and shows an unknown marker instead.
Phonetic reference examples use square brackets, separately from language-profile
phonemic transcription. The transition between schematic positions is not a
recording of real articulatory movement.

## Selected recording source

Creator: **Ruben Schachtenhaufen**, publishing as NewDanishPhonetics.

- [Original IPA-sound-files repository](https://github.com/NewDanishPhonetics/IPA-sound-files).
- Frozen revision: `81c8086257d84f5e434790603bb39b901df8143c`.
- [Creator's recording statement](https://github.com/NewDanishPhonetics/IPA-sound-files/blob/81c8086257d84f5e434790603bb39b901df8143c/README.md).
- [Explicit CC0 1.0 Universal license](https://github.com/NewDanishPhonetics/IPA-sound-files/blob/81c8086257d84f5e434790603bb39b901df8143c/LICENSE).
- [Asset provenance and SHA-256 inventory](reference-audio-sources.json).

The source README states “Recordings of IPA sounds by me, Ruben Schachtenhaufen”.
Its license is CC0, rather than an assumed code license covering third-party
recordings. Each of the 17 selected files was acquired over ordinary verified
HTTPS at the pinned revision and checked as PCM WAV: 44.1 kHz, 16-bit, duration
0.637–0.858 seconds. These are creator-labeled human IPA examples. No IPA
Association endorsement, language/accent-specific standard, independent phonetic
review or physical ground-truth status is claimed.

Available exact symbols: **a e i o u y æ ø œ ɑ ɒ ɔ ɛ ɤ ɯ ɶ ʌ**.

Missing from this verified source: **ɨ ɵ ɪ ʊ ə ɜ ɐ ʉ ʏ ɘ ɞ**. Their diagrams
remain usable and the interface explicitly reports that no verified recording
is available; playback is disabled for that symbol. No neighboring vowel,
speech-synthesis output or private validation-corpus audio is substituted.

The official IPA, University of Victoria, ipachart.com and Wikimedia pages were
inaccessible through this environment's proxy (403). GitHub creator documentation
and the pinned source files were accessible and verified. A Wikipedia-derived
mirror's general attribution alone was not used to fill the remaining voices.
Additional audio needs exact symbol mapping, recording authorship and an explicit
applicable permission/license before enabling it. This leaves 11 requested sounds
unfilled; the feature must not be presented as 28 available recordings.

## Playback, privacy and measurement boundary

Recordings load from the pinned raw.githubusercontent.com URL only after a
selection/replay action. Page load does not fetch audio. The visible source link
credits the author/license per sound; reference playback makes a request to
GitHub, while microphone audio remains local. No recording is copied into this
public checkout and no research population/reference file is involved.

Starting reference playback synchronously cancels active/pending microphone
capture. Starting the microphone stops reference playback; capture is not
automatically resumed after a recording. This prevents intentional concurrent
capture of reference audio. It cannot remove room echoes or certify a user's
recording environment. Stop, selection changes and pagehide cancel playback;
failed/blocked loads keep the diagram and replay controls usable.

The shared `reference-player.js` and CSS serve both locale wrappers. DSP and the
classic default remain unchanged. Previously frozen accuracy reports retain their
original page/source digests; this new UI revision is not that evaluated revision.

## Verification

Tests execute the real pages for selection, exact URLs/provenance, no eager audio,
rapid switching/stale events, unavailable vowels, load/autoplay failures, capture
interlock including late permission, stop/start and pagehide cleanup. Existing
numeric replay and microphone lifecycle regressions remain required.

Real Chromium UI checks use the exact verified WAV bytes served through request
interception, checking decoding/playback, all 28 selections, changing paths,
reduced motion and 1280/390/320-pixel viewports in both languages. This checks
browser integration; it does not establish direct browser access to the live
audio host, physical speaker audibility, microphone accuracy or mobile hardware.

2026-10-21 checks: all 114 Node and 39 Python tests passed, including 16 reference
player tests; bilingual benchmark self-tests and Phase 3/3b checks passed. A fresh
read-only review found no Important/Critical issues. The restricted execution
sandbox denied child-process creation (EPERM); the normal Node suite then passed
with subprocess permission, without disabling or skipping those tests.
Private Chromium results/screenshots are retained under
`/workspace/research-results/reference-player-*`. No production deployment occurred.

## Factual review before release

See [the dated factual audit](docs/REFERENCE_FACT_CHECK_20261021.md). Corrections
include unspecified rounding, schematic dorsal-surface/palate overlap, phonetic
notation, incomplete basic-symbol coverage wording and local-processing claims.
The UI now separates schematic F1/F2 coordinates from the example recordings:
those numbers were not measured from the sound files and are not IPA standards.

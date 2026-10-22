# Reference viewer factual audit — 2026-10-21

Historical release audit: the audio inventory/source below was replaced on
2026-10-22; see [the sound repair](REFERENCE_SOUND_REPAIR_20261022.md).

Scope: the reference-vowel controls, illustrative anatomy, audio attribution,
phonetic descriptions and related chart/privacy claims in both locales.
Baseline: `d7091cd`. This is a factual/implementation review, not an independent
phonetic examination of a speaker or a final acoustic-accuracy assessment.

## Evidence and conclusions

| Claim | Evidence / finding | Result |
| --- | --- | --- |
| Creator published the selected recordings | Pinned README says “Recordings of IPA sounds by me, Ruben Schachtenhaufen”; all 17 file names match the exact selected symbols | Supported as the creator's publication statement; no separate identity certification |
| The recordings are openly reusable | Pinned repository LICENSE explicitly contains CC0 1.0 Universal; license and README hashes match the retained source inventory | Supported by the publisher's express license |
| Audio is unchanged from the selected source | Rechecked every retained file against 19 SHA-256 entries: 17 WAVs plus README/LICENSE | Supported for retained source bytes; remote playback itself does not perform a browser-side hash check |
| 28 reference symbols have recordings | Only 17 exact recordings were acquired and mapped | False if stated; UI discloses 28 diagrams and 17 recordings, and missing symbols disable playback |
| The recordings are official IPA Association standards | Source is a creator's GitHub repository, not an IPA Association endorsement | Unsupported; no such claim permitted |
| A source/license check proves accurate phonetic realization | File names, author statement and WAV format do not independently establish the performed vowel quality | Unsupported; UI now explicitly identifies personal examples and no independent phonetic review |
| [ə, ɐ] imply one neutral lip posture | IPA central-vowel symbols do not prescribe that fixed posture; rounding can vary | Corrected to “rounding not specified”; fixed lip drawings hidden for these examples |
| The side-view animation reproduces real anatomy/movement | Contour is an interpolation from explicit category labels; no speaker imaging or measured movement is present | Described as an illustration of position/transition; no actual-motion claim |
| The tongue fits the drawn roof | Previous close-front contour crossed the roof | Corrected illustrative coordinate range; sampled dorsal contours for all 28 positions now remain below the drawn palate with stroke clearance |
| The generic chart contains every possible IPA vowel | 28 basic vowel symbols do not include every diacritic combination or possible vowel quality | Changed to “28 basic IPA vowel symbols” |
| Reference F1/F2 values describe these audio clips | Values are the existing illustrative table, not measurements from the new recordings; IPA categories do not define universal Hz values | Both locales now state this explicitly |
| F2 is a direct measurement of tongue frontness | Acoustic frontness relationships are useful approximations; rounding, tract geometry and speaker variation also matter | Numeric axes now describe increasing/decreasing frequency, with no tongue-measurement claim |
| All page activity is local-only | Microphone processing is local, but selecting audio requests GitHub | Footer now limits its claim to on-device microphone processing; on-demand requests are disclosed |

## Category review

The conventional IPA chart is the category reference:
[International Phonetic Association — vowels](https://www.internationalphoneticassociation.org/content/ipa-vowels).
Category labels describe phone qualities, not language-specific phonemic status or
a uniquely determined tongue contour. The 28 explicit mappings were checked for
height, backness and rounding against conventional IPA categories, including
central [ɨ, ʉ, ɘ, ɵ, ə, ɜ, ɞ, ɐ], near-close [ɪ, ʏ, ʊ], near-open [æ, ɐ],
front open [a, ɶ] and back open [ɑ, ɒ]. No mapping of a basic symbol was changed;
the unsupported neutral-lip description was removed.

The primary IPA site was inaccessible through this environment's proxy during
source acquisition. No claim is made that a fresh official chart or endorsement
was obtained here. Existing source documents and file provenance are retained;
the [source inventory](../reference-audio-sources.json) identifies exact revisions
and digests. The [recording disclosure](../REFERENCE_AUDIO.md) gives author and
license links. Traditional IPA categories are distinct from actual language or
accent realizations, particularly for [a, ʌ, ə] and other variable vowels.

## Release limits

- The source/rights and category/wording checks support describing this as an
  illustrative learning tool with 17 creator-published human examples.
- They do not support “official standard pronunciation”, “28 playable vowels”,
  anatomical accuracy, calibrated tongue positions or validated pronunciation
  scoring. Independent F1/F2 validation and physical-device gates remain unrun.
- Corrected drawings still simplify a vocal tract and keep a fixed jaw. The
  position transition is not synchronized articulatory imaging of the recording.
- No independent phonetician has reviewed all recordings' realized vowel qualities.
  This limitation is visible beside the source link, not only in this document.
- No push, deployment or public publication was performed as part of this review.

## Verification record

The new regression cases first failed on the original unspecified-rounding
handling, reference notation and tongue/palate intersection. After correction,
20 reference-player cases passed; the full Node suite passed 118 cases and the
Python suite passed 39. Bilingual self-tests and Phase 3/3b checks also passed;
DSP files have no diff.

Chromium checked both locales, all 28 selections, explicit unspecified-rounding
visibility, corrected bracket labels, reduced motion and 1280/390/320-pixel
layouts with no page errors. Playback used verified source WAV bytes through
request interception; live-host access and physical audio devices remain outside
that result. Private results and screenshots use the distinct
`/workspace/research-results/reference-facts-*` prefix; prior artifacts were kept.

A fresh read-only factual review found no remaining Important/Critical
classification or source-claim issues. It identified two minor leftover phrases:
the Chinese “all IPA vowels” header and generic practice sounds written with
phonemic slashes. Both were corrected in the final working tree; phonemic
language-profile inventories keep slash notation. This model-assisted review
does not substitute for an independent phonetician listening to the recordings.

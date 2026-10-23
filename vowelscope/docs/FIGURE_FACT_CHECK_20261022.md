# VowelScope figure factual audit — 2026-10-22

Baseline: `657c800477112675c43b9c52287456dd3c77b4be`.
Scope: all VowelScope figures, not unrelated projects elsewhere on the website.
This is a source, category, geometry and plotting audit, not an expert
articulatory-anatomy certification or an independent acoustic-accuracy result.

## Inventory and findings

| Figure | Review and result |
| --- | --- |
| Chinese and English F1–F2 canvas plots | `xy()` correctly places higher F2 left and higher F1 down, matching tick values and frequency arrows. The former title “IPA Vowel Chart” and unqualified FRONT/BACK headings were misleading: this is a linear-Hz acoustic plot with illustrative reference coordinates, not the official articulatory IPA quadrilateral. Renamed it and used Higher/Lower F2 headings. |
| Live trajectory legend | Plotted history consists of estimated, display-smoothed formants, not measured tongue motion. Chinese “运动轨迹” and the English generic label now explicitly say formant trajectory. |
| All 28 reference tongue poses | Height/backness/rounding metadata match conventional basic IPA categories, with no demonstrated reversed category. The mouth faces right; front vowels move the conceptual dorsum forward, open vowels lower it. Existing sampled palate-clearance regressions pass. These facts do not establish realistic tongue shapes. |
| Lip illustrations | Front inset and side-view concepts agree on rounded versus unrounded classes. [ə, ɐ] keep rounding unspecified and hide the fixed lip shapes. The inset is now explicitly labeled as a front view. |
| Jaw and animation | Jaw geometry stays fixed, and interpolation between categories is not a recording of speech movements. The visible captions now explicitly state those limits. The diagram must not be used as evidence of a speaker's actual anatomy or motion. |
| Language comparison diagrams | A/B colors compare selected transcription symbols; shared symbols do not establish shared phonemes or identical acoustics. Existing dialect/analysis caveats remain necessary. Numeric language positions are schematic, not measured reference distributions. |
| Fixed-filter research figure | Data/units, tap labels, phase counts and displayed curves agree with its archived JSON. The -20-dB guide in the 16-kHz-input panel incorrectly extended to 10 kHz, past input Nyquist (8 kHz). Corrected guide and added out-of-domain hatching in a new figure. |
| Rate-scaled research figure | Same Nyquist-guide defect, corrected in a new figure. Adaptive tap counts 33/47/49/97 and phase counts 3/40/1/1 agree with the original JSON for 16/44.1/48/96-kHz input. |
| Logo waveform and microphone icon | Decorative icons, not measurements or scientific diagrams. No sampled-waveform or anatomical claim is attached to them. |

## Category cross-check

Conventional basic IPA categories used for the review:

| Height | Front | Central | Back |
| --- | --- | --- | --- |
| Close | i, y | ɨ, ʉ | ɯ, u |
| Near-close | ɪ, ʏ (near-front) | — | ʊ (near-back) |
| Close-mid | e, ø | ɘ, ɵ | ɤ, o |
| Mid | — | ə | — |
| Open-mid | ɛ, œ | ɜ, ɞ | ʌ, ɔ |
| Near-open | æ | ɐ | — |
| Open | a, ɶ | — | ɑ, ɒ |

Paired cells list unrounded then rounded symbols. [ʊ] is rounded; [æ] is
unrounded; [ə, ɐ] do not prescribe a fixed rounding category here. This is a
category cross-check, not a claim that every language's broad transcription
has the cardinal realization or that phonetic height equals a universal F1.

The Spanish overlay retains its separately labeled, central illustrative [ä]
position. American/British inventories exclude diphthongs and rhotic vowels
from static points, distinguish optional /ɔ/, and retain broad-transcription
caveats for DRESS. Cantonese distinguishes 11 displayed qualities from a claim
of 11 independent phonemes. Mandarin explicitly uses a partial set of major
qualities and excludes apical/compound nuclei from static points.

## Source and scientific limits

- Category reference: [International Phonetic Association vowel chart](https://www.internationalphoneticassociation.org/content/ipa-vowels).
- Supporting language references remain the university/phonetics links on the
  page. On this audit date, the cloud proxy returned tunnel HTTP 403 for the IPA
  page/PDF, the open linguistics textbook and the linked EdUHK page. No freshly
  retrieved primary text or newly verified external-page content is claimed.
- The reference table's Hz values are not IPA specifications, measured values
  from the 28 recordings, anatomical coordinates or calibrated language targets.
  Source/license verification of an audio recording is not phonetic certification.
- F1/F2 do not uniquely determine tongue shape. Rounding, vocal-tract dimensions,
  language/context and speaker differences matter. A fixed-jaw schematic cannot
  establish anatomically accurate production of every vowel.
- Research figures show sampled coefficient responses, not continuous-band
  guarantees, full-device transfer functions, microphone performance or vowel
  recognition accuracy. For input rate fs, the audit domain ends at fs/2.

## Evidence and preservation

Actual Chromium rendered a contact sheet of all 28 poses for review. A separate
SVG check sampled tongue/teeth fill overlap on a 0.5-pixel grid for all poses;
none was found. This is a sampled rendering check, not anatomical certification.

The actual Matplotlib target-line artists reproduced the original 16-kHz bug:
the line ended at 10 kHz when its domain ended at 8. After the correction, both
figures' four panels passed the same check. Curves' reported pass/stop extrema
and phase/tap labels were checked against their unchanged archived JSON.

New figures use `*-reviewed-20261022.png`; original PNGs, all archived JSON,
research results and production DSP remain unchanged. Evidence, contact sheets
and scripts are retained outside the public checkout with the prefix
`/workspace/research-results/figure-audit-20261022-`.

A fresh independent model-assisted review found no additional Critical or
Important factual issues. Neither that review nor this audit substitutes for
expert phonetic listening, articulatory imaging or real-device testing.

Final local verification: 121 Node tests, 39 Python tests, bilingual benchmark
self-tests and Phase 3/3b passed. Actual Chromium checked 28 poses and all
36 language-selector combinations per locale, every chart symbol, expected
symbol-set intersections, Spanish [ä] labels and 1280/390/320-pixel layouts.
No page errors or horizontal overflow occurred. Audio was stubbed for this
diagram-only run; this is not a new playback or microphone-device result.
Jekyll build passed. Corrections are local; this audit did not deploy them.

# VowelScope Research Phase 2 — spectral peak selection

**Stage:** confirmed exploratory dev-set results. All algorithm variants are **offline research patches only** and do not change the public Chinese/English website.

## Motivation

The baseline LPC estimates F1/F2 as the **first** spectral maxima satisfying broad frequency and spacing ranges. In a [single-nucleus peak audit](public-dataset/peak-dev-audit.json), 24 / 275 dev utterances had F2 errors >300 Hz. Among these 24, **13** had *another* LPC spectral local maximum within ±150 Hz of the corpus reference F2, while **11** had none. This is a useful decomposition: candidate selection could improve some failures, but cannot repair a missing/merged true formant peak by rank ordering alone.

The single-window audit and the full multi-frame benchmark are **not the same measurement protocol**, and their error counts should not be mixed.

## First completed benchmark — 275 dev vowels

| Research variant | F2 MAE | F2 p90 absolute error | Coverage |
|---|---:|---:|---:|
| Production original F1/F2 earliest-valid peak | **212.54 Hz** | **582.50 Hz** | 95.64% |
| Prominent-peak global ranking | 367.27 Hz | 1181.36 Hz | 95.64% |
| Half-power spectral width penalty | 418.20 Hz | 1253.00 Hz | 95.64% |
| Width + temporal continuity penalty | 414.89 Hz | 1417.16 Hz | 95.64% |

These results are from [peak-selector-dev-ablation.json](public-dataset/peak-selector-dev-ablation.json). On this split the unconditionally ranked candidates frequently do much worse, despite unchanged vowel detection. A strong or narrow *spectrum* peak is not guaranteed to be the intended F2 pole. In particular, global ranking can assign higher spectral resonances to F2.

**Decision:** do not deploy any of the three replacements; maintain the original detector as the reference.

## What's different from validated speech-science formant analyzers?

The half-power width used in our experimental ranking is a **frequency-domain grid width** of the LPC spectral magnitude. It is **not** the bandwidth computed from the complex roots of the LPC polynomial.

Praat's LPC-to-Formant algorithm instead finds complex LPC polynomial roots, derives center frequencies/bandwidths from the roots and their radii, and filters/sorts the candidate formants. Its recommended Burg formant analyzer also pays careful attention to the **speaker-specific formant ceiling**, window length, and number of poles. Sources:

- [Praat: Sound to Formant (Burg)](https://praat.org/manual/Sound__To_Formant__burg____.html)
- [Praat: LPC to Formant algorithm](https://github.com/praat/praat.github.io/blob/master/LPC/manual_LPC.cpp)
- [Praat: FormantPath with multiple ceilings](https://praat.org/manual/Sound__To_FormantPath__burg____.html)

Thus the negative result of our heuristic **does not** disprove Burg autoregression, pole-derived bandwidths or formant-tracking algorithms in general.

## Additional experimental hypotheses and guardrails

The [peak_guard.mjs](peak_guard.mjs) research module preserves the original measurement except when a large F2 discontinuity has an alternative coherent with a previous frame. The [compare_peak_selection.py](compare_peak_selection.py) script aggregates the same dev utterances and counts both error and detection coverage.

Separately, a [smoothing ablation](compare_smoothing.py) isolates the visual EMA currently applied to `state.formants`: default smoothing (`alpha=0.32`), faster smoothing (`alpha=0.68`) and no smoothing (`alpha≈1`). This can help distinguish raw formant-estimation error from delayed tracking that carries old frames into the vowel nucleus. It does **not** replace physical microphone testing.

No hypothesis should be promoted to production based on hand-picked successes. Require matched audio, coverage, mean error, F2 p90, and a genuinely new independent test corpus. The prior test partition has already been inspected and must not serve as a blind selection set.

## Second completed benchmark — smoothing is part of the measurement error

The same **275 development recordings** were replayed with the unchanged original LPC estimator and different EMA coefficients. Coverage remained 263/275 (95.64%) in every condition.

| Frame output treatment | F1 MAE | F2 MAE | F2 90th percentile |
|---|---:|---:|---:|
| Site default EMA, α=0.32 | 78.91 Hz | 212.54 Hz | 582.50 Hz |
| Faster EMA, α=0.68 | 48.71 Hz | 170.23 Hz | **471.00 Hz** |
| No EMA, α≈1 | **36.83 Hz** | **148.90 Hz** | 496.75 Hz |

[Detailed smoothing report](public-dataset/smoothing-dev-ablation.json).

This suggests that a significant part of measured error comes from **smearing past candidate errors into the current vowel nucleus**. Eliminating display smoothing is not automatically a better *user experience*—it may cause visually jittery points. The engineering solution to evaluate next is to **separate the acoustic estimate from the smoothed visual marker**.

The conservative peak-rescue variants were also measured. Neither exceeded the original: F2 p90 was 611.14 Hz (guard) and 585.73 Hz (strict guard), against 582.50 Hz baseline, with identical coverage. They are not candidates for promotion to production.

## Next sound DSP iteration

Prioritize root-based LPC pole frequencies and bandwidths, inspect low-vowel F1/F2 mergers, and evaluate ceiling/pole-order sensitivity **on development-only speakers**. An adaptive ceiling may matter more than broad global power ranking, especially across adults and children. Keep physical measurement quality and visible chart smoothing as separate model layers.

No raw research audio, speaker IDs or token-level records appear in this page.

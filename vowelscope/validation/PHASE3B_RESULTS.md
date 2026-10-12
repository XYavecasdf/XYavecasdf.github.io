# VowelScope Phase 3b–3c — Measured results

**Status: executed successfully on 12 October 2026**. [GitHub Actions](https://github.com/XYavecasdf/XYavecasdf.github.io/actions/workflows/vowelscope-phase3.yml) completed synthetic tests, real Hillenbrand development WAV evaluations, and anonymous aggregate publication. No new algorithm was deployed on either live language page.

## Experimental question

Can a different LPC analysis bandwidth and a formant pole-tracking heuristic reduce F2 outliers without harming ordinary vowel detection? And can an optimized resampler preserve the benefit at more practical per-frame CPU cost?

**Data:** 275 US English /hVd/ vowels, 23 speakers in the existing **development partition** of Hillenbrand et al. (1995). This partition was already analyzed in prior experiments: these are **exploratory, not blind final generalization** results.

## 1. Measured full development-split results

| Research configuration | Detected / 275 | F1 MAE (Hz) | F2 MAE (Hz) | F2 absolute error p90 (Hz) |
|---|---:|---:|---:|---:|
| Original browser LPC, acoustic branch (before display EMA) | 263 | 36.83 | 148.90 | 496.75 |
| Pole LPC, order 14, bandwidth limit 400 Hz | **270** | 46.88 | 157.12 | 410.52 |
| 9 kHz LPC analysis rate + anti-aliased resampling, pole-14/B400 | 270 | 89.93 | 225.17 | 648.08 |
| 12 kHz LPC analysis rate + initial 49-tap FIR, pole-14/B400 | 263 | **31.30** | 146.22 | 350.89 |
| Pole-14/B400 + continuity weight 0.5 | 270 | 46.88 | 195.26 | 556.53 |
| Pole-14/B400 + continuity weight 1.2 | 270 | 48.22 | 201.38 | 560.62 |
| **12 kHz + cached polyphase 33-tap FIR, pole-14/B400** | 264 | 31.43 | 138.50 | **251.77** |
| 12 kHz + cached polyphase 49-tap FIR, pole-14/B400 | 265 | 35.43 | **138.40** | 276.53 |

All errors are conditional on obtaining a measured F1/F2 pair; detection coverage must be considered alongside MAE. Percentile boundaries are sensitive to inclusion of difficult tokens.

## 2. Fair comparison on identical detected samples

**258 exact same recordings** yielded valid F1/F2 under all measured variants:

| Configuration | F1 MAE (Hz) | F2 MAE (Hz) | F2 absolute error p90 (Hz) |
|---|---:|---:|---:|
| Original acoustic LPC | 34.56 | 145.43 | 314.25 |
| Order-14 pole LPC, B≤400 Hz | 40.34 | 147.18 | 384.86 |
| 12 kHz original FIR | 31.00 | 140.22 | 275.86 |
| 12 kHz polyphase-33 | **31.26** | 130.09 | **236.43** |
| 12 kHz polyphase-49 | 32.85 | **128.37** | 250.71 |

Do **not** compare the matched sample F2 p90 directly against the all-sample p90 for any variant: the denominators differ.

## 3. CPU cost (rough CI-runner estimates)

| Configuration | Approximate JavaScript processing ms/frame |
|---|---:|
| Original acoustic LPC | 2.87 |
| Pole-14/B400, original analysis rate | 1.23 |
| 12 kHz initial 49-tap filter | 20.45 |
| **12 kHz cached 33-tap polyphase FIR** | **9.98** |
| 12 kHz cached 49-tap polyphase FIR | 13.81 |

The 33-tap optimized 12 kHz version takes **about half as much time** as the previous 12 kHz FIR implementation but remains roughly 3.5× the original LPC path on this GitHub runner. These wall-clock timings are not mobile-browser microbenchmarks; they include the mocked processing path and cannot establish battery consumption or frame responsiveness on an iPhone.

### Why the optimized filter differs acoustically

The original 12 kHz FIR approach applies a low-pass FIR to each of two adjacent input samples and then interpolates. The polyphase versions precompute 64 fractional-delay FIR kernels for each input/analysis-rate pair and use one normalized dot product for each output sample. This **also changes the effective interpolation/filter response**, so improvement cannot be attributed solely to faster code; the two filters are scientifically distinct.

## 4. Cohort differences matter

These are descriptive and sample sizes are limited; the categories are defined in the published corpus, not inferred about a website user.

- **Adult men (96 tokens):** original acoustic F2 MAE 73.30 Hz, versus polyphase-33 **86.29 Hz**; slight mean deterioration.
- **Adult women (84):** original 192.51 Hz, polyphase-33 190.13 Hz; roughly comparable. The 49-tap polyphase version has a slightly lower mean of 178.92 Hz.
- **Boys (47):** original 209.14 Hz, polyphase-33 167.85 Hz; improvement.
- **Girls (48):** original 170.90 Hz, polyphase-33 123.45 Hz **among detected tokens**, but coverage drops from 46/48 to **43/48**. Do not ignore the additional misses.

No universal improvement for all talker groups has been established.

## 5. Technical interpretation

1. Switching the analysis sampling rate to 9 kHz performed poorly. Different rate, changed window duration and low-pass filtering can materially affect LPC pole placement.
2. Our strong/weak continuity penalties worsened F2 error. Track penalties can encourage the wrong resonance to persist; **do not ship them**.
3. A 12 kHz, pole-14, B≤400 Hz estimator with cached 33-tap fractional-delay FIR is the most promising **development-only** joint accuracy/runtime candidate from this round.
4. It is **not a complete Praat Formant Ceiling experiment**. All these variants use 512 output samples, hence physical window duration changes when sampling rate changes. They still constrain F2 to ≤3300 Hz and pole candidates to below 4450 Hz. These confounds require a factorial experiment holding the physical analysis window duration fixed.
5. Source formant values are expert-acquired reference estimates, not unquestionable physiological ground truth. The development set has been repeatedly examined. The next meaningful external validity milestone is **new, independent speakers and devices**, before any scientific accuracy claim.

## 6. Reproducibility and deployment status

- [Aggregate results JSON](public-dataset/phase3-pole-dev.json)
- [Research design and limitations](PHASE3B_PROTOCOL.md)
- [LPC pole/complex root implementation](lpc_poles.mjs)
- [Variable analysis-rate and continuity prototypes](pole_ceiling_tracking.mjs)
- [Cached polyphase sinc filter](fast_resample.mjs)
- [Synthetic unit tests](test_phase3b.mjs)
- [Temporary-corpus downloader and experiment runner](run_phase3_poles.py)
- [GitHub Actions workflow](https://github.com/XYavecasdf/XYavecasdf.github.io/actions/workflows/vowelscope-phase3.yml)

The normal Chinese/English VowelScope pages continue to use the established classic LPC spectral-peak estimator and visual EMA. **Only research code and CI experiment tools changed during Phase 3b–3c.** No raw speech recordings or speaker-level token traces are committed.

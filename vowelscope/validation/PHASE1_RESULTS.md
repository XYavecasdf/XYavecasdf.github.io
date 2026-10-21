# VowelScope — Research Phase 1: experimental findings

**Executed:** 12 October 2026. **Dataset:** Hillenbrand et al. (1995), *Acoustic characteristics of American English vowels*, JASA 97, DOI [10.1121/1.411872](https://doi.org/10.1121/1.411872). [Authorized GitHub host](https://github.com/santiagobarreda/hillenbrand_et_al_1995). Corpus archive SHA-256: `2560548591e3a726c88549b6dc9d226995616c26874d601c69fee8b9eee9d730`.

**Scope:** offline WAV playback into the *actual* VowelScope JavaScript processing functions; the alternative Burg and FIR algorithms are separately instrumented **only in the validation runner**, not deployed on the live site. Original 16 kHz WAVs and per-token annotation files are never committed; public outputs contain aggregated measurements only.

## Research conclusions

1. **Even near-ideal reference F1/F2 cannot make a generic IPA-point classifier reliable for American English**: 55/205 = **26.83%** exact symbol agreement on a 23-speaker held-out test set. This is compared with **33/207 = 15.94%** using the deployed LPC estimates. The denominators differ because two tokens lack complete reference F1/F2.
2. **The front-end LPC is not the only bottleneck**. The existing F2 tracking has a heavy error tail: **37/264** paired test tokens have an absolute F2 error >300 Hz, including **33/264 >500 Hz**.
3. **A learned *language-specific* classifier substantially improves label agreement** on unseen-by-training development speakers, even when fed the current LPC formants: **38/206 = 18.45%** generic IPA vs **93/206 = 45.15%** English 9-class centroid and **104/206 = 50.49%** cohort-aware centroid. These figures count missing estimates as incorrect.
4. **Simply changing to Burg autoregression or adding a short FIR before resampling is not enough.** Neither preliminary dev ablation consistently reduces the long F2-error tail. The next DSP priority is candidate-peak assignment, formant bandwidth estimation, formant ceiling and confidence-aware tracking.

## Data splits (speaker-disjoint)

| Partition | Speakers | Corpus tokens | Used for |
|---|---:|---:|---|
| Train | 93 | 1,109 valid F1/F2 tokens | Learn nine English class distributions |
| Development | 23 | 275 valid F1/F2 tokens | Evaluate model hypotheses and DSP ablations |
| Previously evaluated test | 23 | 276 WAV tokens (274 with full reference F1/F2 in model metadata) | Diagnostics and initial archived baseline; **not used for hyperparameter/model selection** |

Split: `SHA256(speaker_id)[:8]` modulo 100, buckets 0–69 train, 70–84 dev, 85–99 test. The raw corpus holds 1,668 speech tokens.

**Important:** The TEST partition was examined during the earlier baseline and Oracle diagnostics, so it is no longer a completely unseen final validation. New final accuracy claims will require a genuinely new corpus or fresh speaker-disjoint held-out recordings.

## Experiment A: Oracle Test (source formants, no LPC)

On the earlier 276-token test set, 205 tokens have valid source F1/F2 and an exactly comparable single-IPA label.

| Model | Exact broad-IPA symbol matches | Comparable tokens | Agreement |
|---|---:|---:|---:|
| Deployed nearest-IPA classifier fed current LPC | 33 | 207 | 15.94% |
| **Same deployed classifier** fed Hillenbrand reference F1/F2 | 55 | 205 | **26.83%** |

For example, source /i/ obtains **22/23** correct with reference formants, but /ɪ/ obtains **3/23**, and /u/ **3/22**. The 28 generic IPA reference points are **not** a statistically estimated English vowel model. These are exact-transcription-symbol agreement rates, *not* ordinary ASR or pronunciation accuracy.

Aggregated decomposition on 205 comparable reference-labeled tokens:

| Case | Tokens |
|---|---:|
| Oracle and measured LPC both agree with symbol | 24 |
| Reference F1/F2 agrees but LPC path does not | 31 |
| Both disagree with broad IPA symbol | 141 |
| Measured LPC agrees but oracle reference does not | 9 |

The 141 shared mismatches provide strong evidence of reference-model/transcription inadequacy, **not a proof that measurement was correct**.

## Experiment B: F2 error attribution

Source: [phase1-diagnostics.json](public-dataset/phase1-diagnostics.json).

- F2 absolute error above 300 Hz: **37 of 264** available paired test measurements.
- F2 absolute error above 500 Hz: **33 of 264** paired measurements.
- On adults and children, error distribution differs, but age/sex labels and F0 categories are confounded. These group differences do not establish causal mechanisms.
- Prioritize a detailed spectral audit of /ɔ/ and /oʊ/ F2 failures, and tests for mistaken harmonic/peak assignments.

## Experiment C: Train-only English class distributions

Nine exact broad-IPA monophthong classes: `æ ɑ ɔ ɛ ɪ i ʊ ʌ u`. Exclude source rhotic/diphthong classes from exact-symbol scoring. Fit simple log-formant centroids, diagonal Gaussian score, and cohort-specific centroids on TRAIN speakers only. Compare on independently allocated DEV speakers.

**Reference input (corpus annotated F1/F2):**

| Model | Correct / 206 | Agreement |
|---|---:|---:|
| Generic 28-IPA reference | 59 / 206 | 28.64% |
| 9-class English log-F1/F2 centroid | 131 / 206 | 63.59% |
| 9-class diagonal Gaussian | 128 / 206 | 62.14% |
| Cohort-conditioned centroid (adult men/women, boys/girls) | 164 / 206 | 79.61% |

**Deployed LPC output (same 206 development tokens; 196 detected):**

| Model | Correct / 206 | Agreement |
|---|---:|---:|
| Generic 28-IPA reference | 38 / 206 | 18.45% |
| 9-class English log-F1/F2 centroid | 93 / 206 | 45.15% |
| 9-class diagonal Gaussian | 93 / 206 | 45.15% |
| Cohort-conditioned centroid | 104 / 206 | 50.49% |

Do **not** present the 79.61% or 50.49% as live-site accuracy: the former uses annotated reference formants, and the latter relies on metadata describing talker cohort, which is not automatically known from a public microphone session.

Full derived statistics: [classifier-dev-ablation.json](public-dataset/classifier-dev-ablation.json).

## Experiment D: Offline DSP ablation on same 275 development recordings

These are early controlled proposals, not production patches. Burg substitutes AR coefficient estimation while preserving the existing peak-picking code. The FIR uses a short 33-tap windowed-sinc low-pass prior to downsampling.

| Variant | Detection coverage | F1 MAE | F2 MAE | F2 p90 absolute error |
|---|---:|---:|---:|---:|
| Original | 95.64% | 78.91 Hz | 212.54 Hz | 582.50 Hz |
| FIR antialias | 96.36% | 74.25 Hz | 214.87 Hz | 638.28 Hz |
| Experimental Burg | 95.64% | 78.95 Hz | 212.05 Hz | 582.50 Hz |
| Burg + FIR | 96.73% | 75.89 Hz | 224.83 Hz | 786.00 Hz |

For fair conditional comparison, all four estimators produced paired F1/F2 on 261 same development tokens:

| Variant | F2 MAE on common 261 |
|---|---:|
| Original | 213.95 Hz |
| FIR antialias | 208.95 Hz |
| Experimental Burg | 213.46 Hz |
| Burg + FIR | 219.56 Hz |

No variant currently dominates both mean and tail error. **None should be promoted automatically to the public page.** The Burg implementation is not equivalent to the complete Praat algorithm and must not be advertised as such.

Full aggregate output: [dsp-dev-ablation.json](public-dataset/dsp-dev-ablation.json).

## Immediate engineering decision

**Keep the deployed original responsive tracking as default.** Keep current IPA chart as an articulatory/notation reference, not a language-specific statistical classifier.

Next controlled workstream:

1. Examine peaks/poles and bandwidths in F2 outlier windows; distinguish missing poles, falsely chosen peaks, harmonics and boundary coarticulation.
2. Prototype bandwidth-aware peak matching and adaptive formant ceilings using TRAIN/DEV recordings only; use matched-pair F1/F2 MAE, F2 p90 and detection coverage as competing objectives.
3. Prototype a separate *opt-in* English vowel category layer with a trained acoustic model, never quietly relabel the universal IPA reference symbols.
4. Evaluate a future candidate on genuinely unseen recordings, then verify on actual mobile devices.

## Reproducibility

- Benchmark source: [benchmark.mjs](benchmark.mjs).
- Oracle and error attribution: [analyze_phase1.py](analyze_phase1.py).
- English acoustic model experiment: [classification_experiments.py](classification_experiments.py).
- FIR/Burg research alternatives: [dsp_variants.mjs](dsp_variants.mjs) and [compare_dsp.py](compare_dsp.py).
- Original corpus replay: [run_hillenbrand.py](run_hillenbrand.py).
- CI automation: [Hillenbrand validation workflow](../../.github/workflows/vowelscope-hillenbrand-baseline.yml).
- Earlier production baseline: [hillenbrand-baseline.json](public-dataset/hillenbrand-baseline.json).

# VowelScope: First real-speech acoustic validation

**Status: EXECUTED** — source code was replayed against real Hillenbrand recordings via GitHub Actions. This is a quantitative offline baseline, not a microphone-field test or a certified phoneme recognizer.

- Data: Hillenbrand, Getty, Clark & Wheeler (1995), *Acoustic characteristics of American English vowels*. [Research audio and annotations](https://github.com/santiagobarreda/hillenbrand_et_al_1995) (hosted with permission from the researcher).
- Source archive SHA-256: `2560548591e3a726c88549b6dc9d226995616c26874d601c69fee8b9eee9d730`.
- Corpus: 1,668 vowel tokens from 139 speakers, of which **276 tokens / 23 speakers** are on the deterministic speaker-disjoint holdout test partition (7 men, 9 women, 5 boys, 2 girls).
- Recordings: original 16-kHz WAV data replayed to **the actual VowelScope browser analysis code** through an offline simulated WebAudio buffer.
- Reference: `vowdata.dat` F1/F2 at steady state; the average of two manually annotated steady-state times in `timedata.dat` anchors the analysis. These source measurements are reference estimates, not error-free physical ground truth.
- No raw recordings or speaker-level sample traces have been published. Only aggregate metrics are stored.

## Headline comparison

| Metric | Responsive / classic (default) | Experimental anti-jitter / stable |
|---|---:|---:|
| Vowel nucleus detected | 266 / 276 | 112 / 276 |
| Coverage | **96.38%** | **40.58%** |
| Tokens with paired reference F1/F2 | 264 | 111 |
| F1 mean absolute error | 75.73 Hz | 41.62 Hz |
| F2 mean absolute error | 193.46 Hz | 96.55 Hz |
| F1 median absolute error | 62 Hz | 24.75 Hz |
| F2 median absolute error | 74 Hz | 36 Hz |
| F1 90th percentile absolute error | 157 Hz | 78.25 Hz |
| F2 90th percentile absolute error | **593.5 Hz** | 146 Hz |
| Nearest *exact* IPA quality match on 207 comparable labeled tokens, counting misses | 33 / 207 (**15.94%**) | 22 / 207 (**10.63%**) |

**Selection-bias warning:** The overall stable-mode frequency errors use only 111 successful tokens, not the same 264 tokens as classic mode. Do not treat the smaller stable errors as evidence that the mode is generally more accurate.

## Paired mode comparison: same 111 successful vowel tokens

| Metric (the same recordings) | Classic | Anti-jitter |
|---|---:|---:|
| F1 mean absolute error | 65.78 Hz | **41.62 Hz** |
| F2 mean absolute error | 173.52 Hz | **96.55 Hz** |

On the subset of audio where it emits a value, the stable mode can improve errors. **However, it withholds results for ~59% of all annotated vowel intervals**. Therefore keep classic as default and treat stable as experimental.

## Important failure cases

The classic-mode 90th-percentile F2 error of nearly 600 Hz indicates large outliers/peak swaps. Some high-error groups include:

| Annotated vowel | F2 MAE (classic, detected tokens) |
|---|---:|
| [ɔ] (hawed lexical class, dialect-dependent) | 471.4 Hz |
| /oʊ/ (hoed diphthong, evaluated acoustically at steady state) | 474.5 Hz |
| [ʌ] | 240.5 Hz |
| [i] | 216.7 Hz |

These could reflect LPC peak assignment failures, variable diphthong trajectories, fixed schematic IPA coordinates, high-F0 voices, or other speaker-dependent effects. A recording-by-recording analysis is required before claiming a specific cause.

## What the “IPA accuracy” number does and does not mean

The exact-symbol agreement test considers only these nine broad segment mappings: `æ ɑ ɔ ɛ ɪ i ʊ ʌ u`. It excludes the dataset's diphthongs `eɪ`, `oʊ`, and rhotic `ɝ`, because the chart currently does not represent them as independent static IPA reference points.

Even for the nine mapped categories, an acoustic **nearest-reference-symbol match is not speech recognition accuracy**: labels reflect phonological categories, the reference chart uses a generic 28-symbol fixed space, and accent/age/speaker normalization is absent. The 15.94% result must not be marketed as a conventional pronunciation or phoneme-classification accuracy score.

## Scope, limitations, repeatability

1. This is an **offline numerical test** using the app's production `processAudio`, preprocessing, LPC spectral estimation, smoothing and nearest-vowel code. It is **not** a Safari/iPhone/Android microphone test.
2. The dataset contains English /hVd/ words, speakers of different ages, and inherently dynamic vowel trajectories. We compared nucleus-centered frames at the source-annotated time. Timing choices affect numeric errors.
3. The dataset's annotated steady-state measurements are the reference. The source may have annotation uncertainty or missing values (0 in the data files).
4. No optimization of existing LPC settings, IPA reference points or language profiles was undertaken during this baseline. The live website was not modified.
5. Benchmark runner: [benchmark.mjs](benchmark.mjs); corpus import: [run_hillenbrand.py](run_hillenbrand.py); automated evaluation: [GitHub Actions workflow](../../.github/workflows/vowelscope-hillenbrand-baseline.yml). [Full initial baseline JSON](public-dataset/hillenbrand-baseline.json), [latest automatically re-evaluated JSON](public-dataset/hillenbrand-latest.json).
6. On future code changes to either locale's `index.html` or to `benchmark.mjs`, the workflow reruns the same deterministic holdout subset and records metrics in `hillenbrand-latest.json`. The initial baseline is retained for historical comparison.

## Engineering actions justified by the data

**P0:** Keep responsive mode as default; revise anti-jitter so it does not suppress ordinary short vowel nuclei. Measure error *and* coverage simultaneously.

**P0:** Improve F2 robustness. Implement anti-aliasing downsampling, evaluate LPC pole-root/bandwidth filtering or Burg LPC, and add a confidence score for peak selection. Validate improvements on the same 23 held-out speakers without tuning on them.

**P1:** Separate “acoustic accuracy vs literature formant values” from “nearest IPA quality” and learn age/speaker calibration using distinct training and development speakers.

**P1:** Run a small independent device-microphone study to quantify WebAudio hardware processing and mobile browser variance.

The benchmark proves that validation can be executed end-to-end; it does **not** prove VowelScope already has acceptable scientific accuracy.

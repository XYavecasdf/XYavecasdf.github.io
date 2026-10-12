# VowelScope Phase 3 — measured results

**Executed on 12 October 2026**, using the existing [Hillenbrand 1995](https://github.com/santiagobarreda/hillenbrand_et_al_1995) 16 kHz recordings. **Status:** real DEV WAV replay completed; [GitHub Actions workflow](https://github.com/XYavecasdf/XYavecasdf.github.io/actions/workflows/vowelscope-phase3.yml) passed its synthetic-root fixture, bilingual state-isolation assertions, corpus evaluation and results publication steps.

## 1. Architectural implementation

The deployed Chinese and English pages now keep two distinct copies of the latest accepted measurements:

- `state.acousticFormants`: F1/F2/F3 **before display EMA smoothing**, after the optional stable-mode voice/gating checks.
- `state.visualFormants`: independent copy after the existing EMA smoothing for drawing and screen readouts.
- `state.formants`: backward-compatible alias pointing to `visualFormants`, so the public classic/stable chart, trailing points, IPA reference selection and existing slider retain their previous behavior by default.

The offline benchmark supports `--measurement acoustic` and `--measurement visual` (visual is the backward-compatible default). Diagnostic `?lab=1` remains optional.

**Important:** Acoustic F1/F2 are *estimates*, not ground truth. Neither mode directly identifies a human phoneme. The UI currently still classifies using its visual coordinates for compatibility; a separate validated language model can be added later.

## 2. First proper LPC pole-based experiment

An independent JavaScript Durand–Kerner polynomial solver calculates roots of the LPC prediction-error polynomial. Pole frequency and bandwidth are:

```text
f = Fs × arg(z) / (2π)
B = − Fs × ln(|z|) / π
```

The prototype keeps positive-frequency stable poles, applies 400/700 Hz candidate-bandwidth cutoffs, selects the earliest plausible F1/F2/F3 under similar geometric constraints to the baseline, and compares order 14 against 16. The source is in [lpc_poles.mjs](lpc_poles.mjs) and **does not replace the production estimator**. It is **not** Praat's full Burg algorithm. A synthetic 14-pole fixture with known center frequencies and bandwidths passes within 0.05 Hz, and both locale pages pass branch-isolation tests in GitHub Actions.

## 3. Real DEV speech results (275 annotated vowel tokens, 23 speakers)

Reference: corpus-authored steady-state F1/F2 measurements; performance uses frames around the annotated vowel nucleus. **Development set only, previously inspected in Phase 1/2**, not a new blind test.

| Estimator and reporting path | Detection coverage | F1 MAE (Hz) | F2 MAE (Hz) | F2 median error | F2 90th percentile |
|---|---:|---:|---:|---:|---:|
| Production LPC + existing visual EMA | 263/275 (95.64%) | 78.91 | 212.54 | 80.00 | 582.50 |
| **Production LPC before display EMA** | 263/275 (95.64%) | **36.83** | **148.90** | **33.50** | 496.75 |
| Pole LPC order 14, bandwidth ≤700 Hz | 270/275 (98.18%) | 50.84 | 205.70 | 51.49 | 644.78 |
| **Pole LPC order 14, bandwidth ≤400 Hz** | **270/275 (98.18%)** | 46.88 | 157.12 | 45.54 | **410.52** |
| Pole LPC order 16, bandwidth ≤700 Hz | 271/275 (98.55%) | 76.38 | 287.50 | 106.34 | 846.56 |

All values in Hz except coverage. **Mean errors condition on a detection; coverage must be compared alongside them.**

### Matched-pair comparison: same 263 detected tokens

| Estimator | F1 MAE | F2 MAE | F2 p90 |
|---|---:|---:|---:|
| Original LPC acoustic (no display EMA) | **36.83** | **148.90** | 496.75 |
| Pole order 14, B≤400 Hz | 42.50 | 148.96 | **386.41** |
| Pole order 14, B≤700 Hz | 46.79 | 204.07 | 648.71 |
| Pole order 16, B≤700 Hz | 70.71 | 276.44 | 835.96 |

### Interpretation

The most defensible immediate win is **architectural**: avoid using the smoothed cursor position as an acoustic measurement. The apparent benefit from removing EMA comes from reduced time-lag/smearing around the analyzed vowel nucleus; it is **not proof** that visual smoothing is undesirable.

The 14th-order, 400 Hz-bandwidth pole variant is **promising for catastrophic F2 errors and coverage**, but **not unconditionally better**. On the same 263 tokens it lowers F2 p90 from 496.75 to 386.41 Hz while keeping F2 mean error essentially equal and increasing F1 mean error from 36.83 to 42.50 Hz. It is an **experimental research candidate only**, not the default algorithm.

The poor 16th-order results also show that adding poles without tuning the ceiling/bandwidth and candidate assignment can make things worse.

## 4. Reproducibility

- [Full aggregated Phase 3 JSON](public-dataset/phase3-pole-dev.json)
- [run_phase3_poles.py](run_phase3_poles.py): retrieves official corpus in a temporary CI working directory and runs actual webpage signal processing
- [lpc_poles.mjs](lpc_poles.mjs): numerical root and pole bandwidth prototype
- [test_phase3.mjs](test_phase3.mjs): synthetic root and bilingual state-branch tests
- [benchmark.mjs](benchmark.mjs): `--measurement acoustic|visual` and `--dsp-variant pole14_bw400|pole14_bw700|pole16_bw700`
- [workflow](../../.github/workflows/vowelscope-phase3.yml) to repeat evaluation when relevant code changes

No recordings, token-level annotations, or speaker identifiers are committed to this repo.

## 5. Next checkpoints

1. Test whether separate formant ceilings, adjustable LPC order and robust pole tracking improve errors across voice groups.
2. Profile real-time browser CPU cost of Durand–Kerner iterations, which may be too expensive to run on each frame on low-power mobile devices. A production-quality root solver should be optimized/validated separately.
3. Evaluate against a **new** unseen speaker corpus, ideally across different microphones, genders/age groups and languages, before reporting generalized accuracy or deploying a new default estimator.
4. Only then consider optionally enabling a pole formant mode. Keep the responsive classic experience available and retain the language-specific classifier work as a separate project.

### Important limits

This is offline browser-source waveform replay, not a study of device hardware, automatic gain control, noise suppression, or Safari microphone reliability. The current DEV set has already been used to compare earlier candidate methods, so the new numbers are evidence for engineering hypotheses, not a blind final validation.

# Phase 4: reproducible engine and nominal-window control

Executed: 2026-10-13. Research-only; **not independent or actual-device validation**.
Candidate/default deployment status: the classic production detector is unchanged.

## Frozen execution

Code: `6d5af26c1e28e6888f64a52ea2aaec1d7204b63f`, clean checkout. Node 24.19.0,
Python 3.12.14, one variant subprocess at a time on this five-CPU cloud environment.
Verified Hillenbrand archive SHA-256:
`2560548591e3a726c88549b6dc9d226995616c26874d601c69fee8b9eee9d730`.
Only the already-inspected development partition was replayed: 275 tokens from
23 speakers. No final labels or independent audio were acquired.

Reproduction from repository root, using an existing external verified archive:

```bash
python3 vowelscope/validation/run_phase3_poles.py \
  --archive-cache /workspace/research-cache/h95-alldata.zip \
  --out /workspace/research-results/new-phase4-window-run.json \
  --variants original_acoustic pole14_bw400 pole14_fs12000_poly33 pole14_fs12000_poly33_fixed_window
```

Output must be a new external file; do not replace archived evidence. The retained
[aggregate JSON](public-dataset/phase4-window-control-dev.json) is byte-identical to
the executed external report, SHA-256
`35aa8bda488864472660c2746b365f2643bf0727ada04f58c0df879daa347a45`.
No recordings, reference rows or individual predictions are published.

## Hypothesis and controls

The earlier 12-kHz candidate shortened nominal window duration from 512/11025 s
(46.440 ms) to 512/12000 s (42.667 ms). Prespecified control: keep the same 12-kHz,
order-14, bandwidth-400-Hz, 33-tap polyphase implementation, but use 557 samples
(46.417 ms), the nearest output-sample approximation of original duration.
This is a window-duration ablation, not a complete formant-ceiling factorial study.

## All 275 eligible development tokens

| Estimator | Detections | Coverage | F1 MAE Hz | F2 MAE Hz | F2 p90 Hz | F2 errors >500 Hz |
|---|---:|---:|---:|---:|---:|---:|
| Original raw acoustic | 263 | 95.64% | 36.830 | 148.904 | 496.750 | 26 |
| Pole14/B400 at original rate | 270 | 98.18% | 46.877 | 157.116 | 410.524 | 25 |
| Poly33, 12 kHz, 512 samples | 264 | 96.00% | 31.426 | 138.495 | 251.766 | 20 |
| Poly33, 12 kHz, 557 samples | 263 | 95.64% | 32.948 | 144.387 | 251.785 | 22 |

Errors condition on valid detected pairs; missed tokens remain in coverage.
Original and historical short-window acoustic results exactly reproduce the
archived point estimates after shared-engine extraction. EMA is not used here.

### Same 259 tokens detected by all four selected estimators

| Estimator | F1 MAE Hz | F2 MAE Hz | F2 p90 Hz |
|---|---:|---:|---:|
| Original | 34.525 | 144.951 | 314.250 |
| Pole14/B400 | 40.271 | 146.714 | 384.857 |
| Poly33/512 | 31.179 | 129.597 | 236.432 |
| Poly33/557 | 32.596 | 135.202 | 247.032 |

The common denominator is 259 for these four estimators, not the historical 258
shared by a larger set of variants. It is not an all-token comparison.

## Speaker-cluster uncertainty

2,000 deterministic bootstrap replicates, seed 20261013, speakers resampled with
replacement and all their tokens retained. Same cluster draws are used for variants.
Intervals below are percentile 95% intervals, not evidence of generalization.

| Estimator | Coverage interval | F1 MAE interval Hz | F2 MAE interval Hz | F2 p90 interval Hz |
|---|---|---|---|---|
| Original | 92.75–98.18% | 26.00–50.19 | 107.22–193.71 | 187.50–703.50 |
| Poly33/512 | 93.04–98.55% | 23.31–41.01 | 100.87–181.53 | 159.71–600.88 |
| Poly33/557 | 92.36–98.19% | 24.62–42.96 | 99.77–193.28 | 160.85–680.83 |

The apparently strong point estimates coexist with considerable tail uncertainty.
The repeatedly examined DEV population cannot satisfy the independent gate.

## Subgroup limitations and negative outcome

Group speaker counts: adult men 8, adult women 7, boys 4, girls 4. All group counts,
coverage/errors, intervals and vowel-class summaries are retained in the JSON.

- Adult-men mean F2 error remains worse for both polyphase versions than original:
  86.286/86.033 versus 73.301 Hz, among the same 94 detected tokens.
- Adult-women mean F2 errors remain approximately 190–192 Hz and p90 approximately
  526–530 Hz for the polyphase candidates. Aggregate acceptance cannot hide this.
- Boys: extending the window worsens F2 MAE from 167.845 to 202.191 Hz and p90
  from 187.225 to 488.903 Hz, with unchanged 45/47 coverage. **Retain this failure**;
  do not promote the longer window as universally superior.
- Girls: both polyphase variants detect 43/48 (89.58%), below original 46/48;
  conditional mean-error improvement does not repair missing detections.

These small groups cannot support precise population fairness claims. The window
control keeps most aggregate tail benefit but does not remove group problems.
Do not change the default or retune against a final holdout from these results.

## Numerical and browser checks

At synthetic 48-to-12 kHz resampling, 1-kHz gain was +0.0144 dB and 8-kHz residual
was -42.0375 dB, including the current finite-frame boundary handling. Tests also
cover finite/DC-centered output at 16/44.1/48/96 kHz and insufficient buffers.
These two frequencies do not certify the entire passband/stopband or speech accuracy.

Node mean processing time per frame: original 2.028 ms, poly33/512 7.117 ms,
poly33/557 7.535 ms. These are cloud VM timings, not microphone/mobile performance.

Actual Chromium loaded both static locale assets without page errors and kept
classic default. A separate **synthetic fake-device** session on code `0219a84`
executed 30 processing attempts per locale at 44.1 kHz, accepted 29, ended all
native test tracks, and reported no 75-ms CPU overrun. Classic processing p95 was
1.5 ms (Chinese) / 1.0 ms (English). This is short functional instrumentation
evidence, not a physical microphone or advanced-algorithm latency result.

Physical capability probe, without fake devices: granted microphone permission,
empty device list and `getUserMedia` `NotFoundError`. Actual desktop/Android/iOS
testing remains unrun. See the [device protocol](../docs/DEVICE_TEST_PROTOCOL.md).

## Engineering verification and next action

83 Node tests (including 30 adjacent ConsonantScope tests) and 17 Python tests
passed; existing bilingual smoke and Phase 3/3b checks passed. Shared classic
three-frame golden results stayed exact. Review findings about pending `resume`
resources and lost aggregation metadata were reproduced by failing tests and
fixed. Deliberate display pauses no longer inflate missed-hop diagnostics.

Independent final evaluation remains blocked by verified audio/annotation access,
and real-device testing by physical microphone access. The [independent assessment](../docs/INDEPENDENT_DATASET_ASSESSMENT.md)
and [frozen target/protocol rules](../../docs/VALIDATION_PROTOCOL.md) describe the
minimum prerequisites. Preserve this candidate/evidence while acquiring a valid
independent population. No final validation report, accuracy success or new live
default is claimed.

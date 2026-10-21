# VowelScope experiment log

All prior experiments and negative findings remain in `vowelscope/validation/`
Phase 1–3b reports and their original aggregates. No archived report is rewritten.
Their DEV/test sets are inspected, not blind final validation.

## 2026-10-13 — Reproducibility and shared-engine iteration

Hypothesis: duplicated in-page DSP and invented mock input defaults make code and
configuration comparisons fragile. Shared pure functions plus actual script/default
loading can preserve classic results while making the replay protocol traceable.

Methods: test-first shared API, exact pre-refactor classic three-frame fixtures,
both locales, synthetic WAV CLI replay, existing root/state and research dispatch
checks, verified source archive, read-only artifact publication. Protocol v2 follows
HTML defaults; explicit legacy60 preserves historical visual comparisons.

Observed before implementation: missing shared module tests failed; replay protocol
test reported schema 1 rather than 2; archive/provenance helper tests failed on missing
interfaces; eight capture cancellation/close-race tests failed on current production.
After targeted fixes these contracts passed. Actual test counts/provenance and
corpus experiments are recorded below as runs finish, never inferred from a plan.

## 2026-10-13 — Window-duration control

Hypothesis defined before evaluation: part of the old 12-kHz polyphase benefit may
depend on its shorter physical window. Compare original acoustic, pole14/B400,
poly33/512 and poly33/557 on identical DEV tokens. 557/12000 seconds approximates
512/11025 seconds within half one output sample. No final-test recordings are used.

Synthetic checks: 1-kHz gain within +/-1 dB; 8-kHz residual below -20 dB at
48-to-12 kHz; finite/DC-centered output at 16/44.1/48/96 kHz; insufficient buffers
rejected; fixed-window length 557. These engineering filter checks are not formant
accuracy or broad stopband certification. Actual corpus outcomes will decide the
hypothesis; failed comparisons remain logged.

## 2026-10-13 — Device capability and independence

Actual Chromium metadata/capture probe: secure loopback, granted microphone,
device list empty and getUserMedia NotFoundError. No physical microphone evidence.
VTR metadata assessment reads methods/licenses only, not final WAV/label rows;
upstream acquisition/rights remain unverified. No independent accuracy result.

## Executed window control and review corrections

Exact clean code SHA `6d5af26c1e28e6888f64a52ea2aaec1d7204b63f`, pinned archive,
275 DEV tokens/23 speakers. Original acoustic results reproduced exactly. Poly33/512:
96.00% coverage, F1 MAE 31.426 Hz, F2 MAE 138.495 Hz, p90 251.766 Hz. Fixed-duration
poly33/557: 95.64%, 32.948/144.387/251.785 Hz respectively. Same 259 detected tokens:
F2 MAE original 144.951, poly33/512 129.597, poly33/557 135.202 Hz.

Negative finding retained: boys F2 p90 rises 187.225 ->488.903 Hz with the longer
window; girls coverage remains 43/48. Poly33/512 F2 MAE speaker-cluster 95% interval
is 100.8689–181.5282 Hz, p90 interval 159.7065–600.8771 Hz. No universal reliability
or independent accuracy claim follows. Full metrics, cohorts, vowel summaries and
2,000-replicate seed/method are in the [new aggregate](../vowelscope/validation/public-dataset/phase4-window-control-dev.json)
and [results report](../vowelscope/validation/PHASE4_WINDOW_RESULTS.md).

Review found acquired resources leaking while resume stayed pending and protocol
metadata lost in legacy aggregators. New failing tests reproduced both; targeted
fixes passed. All published aggregate paths now retain safe input configurations;
historical deltas are skipped for unknown/different replay parameters. Manual pause
timing is excluded from missed-hop diagnostics. Final suite: 83 Node/17 Python passed.

Synthetic filter observations: +0.0144 dB at 1 kHz and -42.0375 dB at 8 kHz for
48->12 kHz poly33. Two-frequency checks are not full response certification. Short
Chromium fake-capture profiling exercised actual WebAudio/app lifecycle, but the
actual-input device probe failed NotFoundError. Both outcomes remain distinct.

## 2026-10-13 — Open-data reference preparation

User direction: use publicly available vowel data. Acquired a CC BY-NC 4.0
L2-ARCTIC distribution pinned to `81b4ebae862d238ca58e0367d308b9787511e369` for
private noncommercial research, retaining source attribution/LICENSE. Official
metadata destinations returned tunnel403; this is an explicitly identified mirror.

Before any acoustic prediction, selected the first three manual annotation files
per documented speaker and vowel intervals >=100 ms. Prepared 24 speakers,
72 unique PCM recordings (21,082,610 bytes), 449 candidate windows, 49 with
annotation warnings. No F1/F2 estimates were generated, no final labels inspected,
and every reference frequency/time remains null/pending. Source phone labels alone
cannot complete the independent accuracy gate. See
[OPEN_CORPUS_PREPARATION.md](../vowelscope/docs/OPEN_CORPUS_PREPARATION.md).

Fresh review identified unchecked cache reuse, truncated TextGrid counts, unchecked
phone operations and pending rows hidden under a reviewed manifest header. Failing
tests reproduced these; fixes passed. Pinned HTTPS download receipts now verify
source URL/commit/digest/size before reuse; unreceipted files are refused. Receipts
are not independently signed upstream checksums. A fresh external cache and a
subsequent cache-only run reproduced the same population. Two uppercase source `S`
markers prompted a separate failing test and case-insensitive operation handling.

All 146 retained source document/annotation/audio hashes were checked; 72 audio
hashes are unique. The preserved private queue `reference-review-queue-02.json`
has SHA-256 `8ee596c05d41585622df4f1750ae2b5ab6a575ee5b70191eb43ec5ca1768fe02`,
records the preparation code digest and actual Git context, and passes null/pending
and population checks. No source audio or individual annotations enter the repo.
85 Node tests (including 30 ConsonantScope regressions), 24 Python tests, bilingual
smoke, Phase3/3b and syntax checks passed locally. No remote CI, final accuracy,
physical microphone test or deployment is implied. Remaining prerequisites are
blinded expert formant review, a frozen eligible population and real devices.

## 2026-10-14 — Preregistered exact-zero interpolation control

Hypothesis: classic `buffer[j+1] || a` replaces valid zeros with the preceding
sample at fractional positions. Correcting the second endpoint should restore
linear interpolation for finite PCM while changing nothing on nonzero input.
This is a numerical correctness hypothesis, not an assumed accuracy improvement.

Before corpus evaluation, reproduced an analytic four-point triangle resampled
at step 1.5: expected eight-point cycle `[1,-.5,0,.5,-1,.5,0,-.5]`, RMS sqrt(3/8)
(0.6123724357); actual classic cycle `[1,-.5,0,1,-1,.5,0,-1]`, RMS 0.75.
All DEV recording metadata inspected for this experiment is 16 kHz, so fractional
positions can occur. Independent L2-ARCTIC recordings remain unscored and untouched.

Design fixed before execution: offline `linear_zero_safe` only, nullish fallback
for the second endpoint, original 512/11025 nominal window, identical mean removal,
RMS, pre-emphasis, Hamming window, LPC and classic acceptance. Live shared DSP and
both locale pages remain unchanged. Runner selection is explicit and the historical
default variant set is preserved. Use original_acoustic vs original_acoustic_zero_safe
on exactly the existing 275 DEV tokens/23 speakers, acoustic path/default slider.
Source archive SHA-256 must match the existing pinned digest; save a new external
aggregate with exact code/configuration, all-token and common-detected metrics,
cohort/vowel summaries and deterministic speaker-cluster uncertainty.

Numerical acceptance: analytic zero-crossing fixture exact; raw/y/RMS bit-identical
to classic on nonzero samples at 16/44.1/48/96 kHz; silence/short-buffer and bilingual
contracts pass. Corpus evaluation reports coverage, F1/F2 MAE, F2 p90 and failures
without omissions. Any accuracy/cohort regression is retained in the report; the
experiment does not promote a production change, even if aggregate DEV improves.
No final labels, thresholds, population or independent predictions are adjusted.

Tests initially failed on missing patch/CLI/runner selection. After implementation,
the analytic fixture and unchanged nonzero-input contracts passed. Corpus results
will be appended after the frozen-source run; do not infer their direction here.

Executed at exact clean `093516db58d8be4c5a7a414c3bca89a8dec82d20`. Both variants
detect 263/275 (95.64%), with 262 common detections. F2 MAE worsens
148.904 ->152.385 Hz and p90 496.750 ->575.000 Hz. All-token F1 MAE changes
36.830 ->35.593 Hz, but on identical common detections worsens 35.299 ->35.704 Hz.
/eɪ/ gains one detection; /ɑ/ loses one. Do not promote the correction to live DSP.
89 Node/26 Python tests, bilingual smoke, Phase3/3b and syntax checks passed.
Reviewer found unsafe omitted output and lost page/patch digests; failing tests
reproduced both and corrections passed before the clean source run. Full retained
negative evidence is in [PHASE4_ZERO_RESULTS.md](../vowelscope/validation/PHASE4_ZERO_RESULTS.md).

## 2026-10-14 — Planned multirate FIR response audit

Question fixed before measurement: do the existing 33-/49-tap 12-kHz polyphase
filter banks retain +/-1-dB amplitude at 250–4500 Hz and suppress 6500-Hz-to-input-
Nyquist components by >=20 dB at 16/44.1/48/96-kHz input? These are engineering
audit budgets, not formant accuracy gates. Sample frequencies every 250 Hz and
the Nyquist endpoint. Inspect actual generated coefficients, distinguishing all
64 bank phases from phases reachable by the 512-output-sample resampling rule.
Report frequency envelopes, sampled pass/stop extrema and failures explicitly.
The transition band is not part of these sampled budgets. No finite sweep proves
a continuous-band bound. Exclude window-boundary clamping, detrending, pre-emphasis,
LPC and devices from this coefficient-level response; those need separate evidence.
No independent recordings, final labels or algorithm parameters will be changed.

Executed on clean `7861e839ba72a8e028084dfb9f5fbbef64bfa301`. 33 taps pass the
sampled budgets only at 16-kHz input; at 44.1/48/96 kHz the lowest passband gain is
-1.732/-1.951/-3.634 dB and worst stopband gain -17.451/-16.271/-10.268 dB.
49 taps pass at 16/44.1/48 kHz, but 96-kHz input still gives -2.727/-13.026 dB.
Thus the old 1-kHz/8-kHz check at 48 kHz cannot certify multirate behavior.
All failures and an inspected figure are preserved in
[PHASE4_FIR_RESULTS.md](../vowelscope/validation/PHASE4_FIR_RESULTS.md).

## 2026-10-14 — Preregistered rate-scaled FIR experiment

Hypothesis: a fixed number of input-domain taps shortens the physical filter
support at high input rates, widening the transition. Use half-length
`max(16, ceil(inputRate/2000))`, i.e. 33/47/49/97 taps at 16/44.1/48/96 kHz.
The half-support is >=0.5 ms, retaining the existing 33-tap filter at 16 kHz.
Keep cutoff, phase count/selection, 512/12000 window, pre-emphasis, pole order,
bandwidth and gates unchanged. This choice comes from the coefficient audit,
not unseen speech frequencies or final-set error.

Acceptance fixed before implementation: match original poly33 raw/y/RMS and
formant outputs at 16 kHz; pass the same sampled +/-1/-20-dB budgets at all four
rates; retain finite/DC/short-buffer and kernel-cache behavior. Compare actual
DEV accuracy against poly33, expected identical for its 16-kHz recordings,
and report synthetic warm/cold analysis elapsed time separately from device latency. Keep
the variant offline and require explicit external output for new experiments.
Any coefficient, speech or performance failure stays documented; even a pass
cannot clear independent references or actual-device prerequisites.

Runtime protocol before measurement: actual `processAudio` in the Node VM page
harness, classic acoustic mode, stationary synthetic multitone fixture; one cold
analysis, 20 warmup analyses, then 200 timed analyses at synthetic 75-ms timestamps.
Report attempts, processed/accepted counts, cold elapsed time, warm median/p95/p99/max and
overruns of 75 ms. Compare poly33 and adaptive on each of the four input rates.
Use performance.now() wall-clock elapsed time, including scheduling and GC;
this is not process CPU accounting. Page/context setup is outside the timer; filter initialization is inside the cold
analysis. p95 below 75 ms is a host computation check only. This does not measure
real scheduling, capture, end-to-end latency or mobile performance, and synthetic
valid counts are not independent speech coverage.

Executed all three runs on clean `adeb7b0aee37c35abdd5065a4c9bd386d9530214`.
The adaptive bank passes the sampled coefficient budgets at all four input rates.
Lowest pass /highest stop dB: 16k -0.029/-52.136; 44.1k -0.827/-26.166;
48k -0.948/-24.962; 96k -0.954/-24.984. DEV poly33/adaptive both detect 264/275,
shared 264, and preserve recorded all/common/cohort/vowel metrics and uncertainty:
F1/F2 MAE 31.426/138.495 Hz, F2 p90 251.766 Hz. Girls 43/48 coverage and adult-
women F2 tails remain unresolved, so no fairness/generalization claim follows.

Host adaptive warm p95 elapsed times: 7.507/8.387/9.219/17.930 ms, 200 timed
calls per rate, all processed/accepted, no >75-ms calls. At 96 kHz original poly33
p95 is 5.980 ms: roughly triple analysis cost for stronger filtering. These are
one-host synthetic wall-clock observations, not actual scheduling/device evidence.
A reviewer corrected the timer label before measurement; plotting later corrected
the adaptive tap-count legend without changing measurements. 98 Node/27 Python,
bilingual smoke, Phase3/eight Phase3b variants passed; classic defaults unchanged.
Full retained evidence and three reproduction commands are in
[PHASE4_ADAPTIVE_FIR_RESULTS.md](../vowelscope/validation/PHASE4_ADAPTIVE_FIR_RESULTS.md).

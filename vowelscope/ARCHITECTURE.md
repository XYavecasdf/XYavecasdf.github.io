# VowelScope architecture and Phase 4 audit

Audit date: 2026-10-13. Baseline commit:
`c544b673c73f0234d63a23fafe892cba5f53171d`. Scope: production pages, numerical
research modules, replay instrumentation, archived aggregates and workflows.

## Production data flow

```text
getUserMedia (echo cancellation / noise suppression / AGC requested off)
  -> AudioContext -> source -> AnalyserNode (8192 samples, smoothing=0)
  -> muted GainNode -> destination
requestAnimationFrame -> processAudio (>=75 ms between processing attempts)
  -> latest input samples, linearly resampled to 512 samples at 11025 Hz
  -> mean removal -> RMS threshold -> pre-emphasis 0.97 -> Hamming window
  -> autocorrelation / Levinson-Durbin (order 14, regularization 1.0001)
  -> LPC spectral grid (100..4500 Hz, 12.5 Hz steps)
  -> earliest eligible peaks -> candidate F1/F2/F3
  -> classic: accept immediately
     stable: periodicity gate + two-frame onset/jump confirmation
  -> acousticFormants: independent accepted estimate
  -> visualFormants: EMA controlled by smooth slider
  -> formants: alias to visualFormants
  -> trail, readouts, chart and nearest schematic IPA reference
```

`?lab=1` shows accepted raw and visual formants and their F2 offset. Stable
acceptance now compares with acoustic history; its original implementation
compared with the visual alias, leaking slider state into acceptance decisions.
The chart and existing IPA reference lookup still consume the visual alias.

`index.html` and `en/index.html` duplicate state, audio lifecycle, DSP, chart and
profiles. Labels/copy are localized, but there is no shared production module.
This milestone leaves the DSP declarations intact to protect established replay
patches. `validation/page_harness.mjs` provides reusable test-side instrumentation
and reads HTML slider defaults; it is not loaded by production pages.

## Existing numerical research

- `lpc_poles.mjs`: a monic prediction-error polynomial
  `z^p + a1*z^(p-1) + ... + ap`; general Durand–Kerner iteration, clipped steps,
  finite checks, convergence and residual rejection. Positive stable poles are
  mapped to frequency `Fs*arg(z)/(2*pi)` and bandwidth `-Fs*log(|z|)/pi`.
  This is not the complete Praat Burg pipeline.
- `fast_resample.mjs`: offline patch with 64 normalized fractional-delay FIR
  phases, nearest-phase quantization, 33/49 Hamming-windowed taps and clamped
  input boundaries. Kernel cache retains the current sample-rate configuration.
- `pole_ceiling_tracking.mjs`: analysis-rate and continuity experiments; 512
  output samples are retained when changing rate. Physical window duration
  therefore differs (46.44 ms at 11025 Hz versus 42.67 ms at 12000 Hz).
- `dsp_variants.mjs`, peak/temporal patches: research-only function replacements
  injected into the real page at `requestAnimationFrame(frame)`.

Existing synthetic tests recover known poles and exercise plausible multitone
input. They do not yet quantify stopband attenuation, phase/DC edge behavior,
fixed-duration comparisons, ill-conditioned roots or microphone scheduling.
Further numerical work must hold physical window duration and compared tokens
fixed before attributing a change to a ceiling or resampler improvement.

## Validation and audited results

`benchmark.mjs` extracts the actual inline JS into a VM, simulates the DOM and
replays PCM16/float32 WAV samples. Each annotated nucleus is summarized using
medians of newly accepted frames, not an old displayed value. Acoustic and visual
reporting paths are selectable. The generic IPA reference result is not an
English phoneme classifier or a pronunciation score.

Archived Phase 3b/3c JSON: 275 development tokens, 23 speakers, 258 tokens detected
by every variant. Count/coverage consistency was checked across all-token and
common-detected summaries. Exact archive SHA-256 in the JSON is
`2560548591e3a726c88549b6dc9d226995616c26874d601c69fee8b9eee9d730`.

| Archived configuration | Detected / 275 | F1 MAE | F2 MAE | F2 p90 | F2 error >500 Hz |
|---|---:|---:|---:|---:|---:|
| Original visual | 263 | 78.914 | 212.540 | 582.500 | 31 |
| Original acoustic | 263 | 36.830 | 148.904 | 496.750 | 26 |
| 12 kHz polyphase-33 pole-14/B400 | 264 | 31.426 | 138.495 | 251.766 | 20 |
| 12 kHz polyphase-49 pole-14/B400 | 265 | 35.425 | 138.396 | 276.531 | 21 |

Errors condition on paired detections; the last column's denominator is that
paired count, not every token. Common-detected results instead use 258 identical
tokens. Group-level differences include worse adult-male mean F2 error and fewer
girl-cohort detections for polyphase-33. No independent generalization follows.
CPU timings are Node VM timings, not mobile-browser latency. Archived aggregate
consistency is not a fresh waveform rerun or verification of each annotation.

### Reproducibility issues to resolve before new corpus comparisons

1. Historical VM tools initialize every mock input to `60`; live smooth defaults
   to `58`. Their historical visual alpha is .32, while actual default alpha is
   .332. This does not affect classic raw acoustic results, but changes EMA-based
   results. Preserve old artifacts; version/configure the corrected protocol.
2. Corpus runners fetch a mutable upstream `main` URL and record the downloaded
   hash without rejecting unexpected hashes. Pin the documented archive before
   future experiments; never replace checksums merely to make a run succeed.
3. Phase 3 provenance uses `GITHUB_SHA` or the string `local`; local experiments
   need a real Git SHA and exact configuration. Common detection across all
   variants can change when another variant is added; pairwise cohorts should
   also be reported. Confidence intervals and browser memory profiles are absent.
4. Classic preprocessing uses `buffer[j+1] || a`: an exact zero sample becomes
   `a`, not zero. Quantify this numerical edge case before a separately tested
   resampler correction; classic numeric behavior is unchanged in this milestone.
5. Pagehide currently stops assigned tracks only. Pending permission/startup
   cancellation and actual-device suspension/resume require a dedicated capture
   lifecycle contract; no hardware or tab-navigation reliability claim is made.

## CI and publication audit

- `vowelscope-validation.yml`: push/PR path-filtered fast checks, Node 22/Python
  3.12, no corpus acquisition. Now includes production state/lifecycle regressions.
- `vowelscope-hillenbrand-baseline.yml`: push/manual, full corpus and research
  comparisons, then commits seven aggregates to the triggering branch.
- `vowelscope-phase3.yml`: push/manual, synthetic checks and development corpus
  comparisons, then commits Phase 3 aggregate to the triggering branch.
- The two publishing workflows use different concurrency groups. Each cancels
  its own older runs, but this does not coordinate cross-workflow writers.
  `git rebase -X theirs` can replay an old computed report onto a newer source
  revision and resolve report conflicts in favor of the replayed commit. An
  ordinary push can also lose a race and fail. Preserve source provenance;
  prefer run artifacts and explicit reviewed publication, or fail stale writes
  after checking that relevant source still matches the evaluated revision.

Recent remote workflow results could not be read: GitHub API request returned
proxy tunnel 403. Report documents reference successful historical runs, but that
is not independent confirmation of current remote CI. No credentials were requested.

## Baseline and milestone checks

From repository root:

```bash
node vowelscope/validation/benchmark.mjs --self-test --page vowelscope/index.html
node vowelscope/validation/benchmark.mjs --self-test --page vowelscope/en/index.html
node vowelscope/validation/test_phase3.mjs
node vowelscope/validation/test_phase3b.mjs
node --test vowelscope/validation/production.test.mjs
node --test consonantscope/tests/*.test.cjs
```

The first four commands and all 30 adjacent ConsonantScope tests passed before
edits. New acceptance tests failed in both locales on the original visual
comparison. Startup cleanup failed at six injected stages in both locales, and
one throwing disconnect prevented later cleanup. These failures passed after
their targeted fixes. Classic fixtures were recorded from unmodified `c544b67`
at the actual HTML smooth=58 setting, including two vowel transitions.

See `docs/superpowers/plans/2026-10-13-vowelscope-phase4.md` for final executed
validation and milestone boundaries. No full corpus rerun, new independent
dataset, Android/iOS microphone test or live publication occurred in this milestone.

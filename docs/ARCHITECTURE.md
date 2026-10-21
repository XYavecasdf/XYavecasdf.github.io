# VowelScope current architecture

The initial audit and archived metric denominator definitions remain in
[`vowelscope/ARCHITECTURE.md`](../vowelscope/ARCHITECTURE.md). This document describes
the subsequent autonomous research implementation.

Both static locale pages load `vowelscope/dsp/core.js`. Pure functions cover classic
linear preprocessing, pre-emphasis/windowing, autocorrelation LPC, Levinson–Durbin,
spectral peak selection and voiced evidence. `smoothFormants` returns a separate
visual copy. Locale wrappers preserve historical offline research replacement
points, including passing the current spectrum function into candidate selection.
No research pole algorithm is loaded into the live detector by default.

Capture/acceptance/render state stays local to each page during incremental
extraction. Accepted acoustic values feed stable-mode gates; visual values feed
EMA/chart/legacy reference lookup. Capture generations invalidate late permission
and resume completions. Stop detaches state before asynchronous close, preventing
an old cleanup from clearing a new session; pagehide invalidates pending capture.

`dsp/profiler.js` has no sample or formant access. Only `?profile=1` activates
bounded timing collection and `window.VowelScopeDiagnostics.snapshot()`. Metrics
cover processing CPU and estimated missed 75-ms processing opportunities, not
audio sample loss or input-to-display latency. Only negotiated processing flags
and context sample rate are exposed; no device IDs/names are exported.

Validation `page_source.mjs` loads the actual local assets before the inline script.
Protocol v2 uses live HTML slider defaults, explicitly permits historical
`--smoothing legacy`, and hashes both page/assets and injected research patches.
Git HEAD and dirty state are reported. `corpus_source.py` rejects unexpected
archive digests before extraction. New Phase 3 runs use external exclusive output
and may choose only named variants to avoid unrelated rebuilds/expensive runs.

All three VowelScope workflows watch shared DSP assets. Fast CI executes new
Node/Python contracts. Corpus CI retains aggregate artifacts with read-only
repository permissions; it no longer rebases computed reports onto newer source
and auto-pushes them. Existing published aggregate files are preserved until an
explicitly reviewed update.

Research-only `pole14_fs12000_poly33_fixed_window` uses 557 output samples, nearest
to the original nominal 512/11025-second analysis window. It isolates window
duration from the old 512-at-12k experiment while retaining order/bandwidth/FIR
settings. A three-way DEV comparison does not establish independent accuracy.

Remaining boundaries: capture/UI/reference data are still duplicated; a full
fixed-window factorial ceiling study and independent model remain future work.
Classic exact-zero interpolation remains preserved in production. The offline
`linear_zero_safe` control verifies the numerical correction but worsens DEV F2
MAE/tails; see [retained results](../vowelscope/validation/PHASE4_ZERO_RESULTS.md).
Device accuracy, fairness and timing require actual accessible hardware.

Research-only `pole14_fs12000_poly_adaptive` sets half-length to
`max(16, ceil(inputRate/2000))`, retaining poly33 at 16 kHz and increasing support
for higher-rate capture. No live page loads it. Actual bank/phase audits pass the
sampled coefficient budgets at four rates, and a clean DEV replay preserves
poly33 metrics. `resampler_profile.mjs` measures synthetic host processAudio wall
time; its metadata explicitly excludes capture/rendering/scheduling/device claims.
See [results and limits](../vowelscope/validation/PHASE4_ADAPTIVE_FIR_RESULTS.md).

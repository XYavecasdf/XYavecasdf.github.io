# Phase 4 first milestone: measurement isolation and capture recovery

## Purpose and scope

Support dependable live microphone feedback for pronunciation exploration.
The takeover brief authorizes incremental implementation, tested fixes, an
architecture audit and a stored engineering plan. This milestone addresses
existing state/lifecycle defects before changing estimation algorithms.

## Contracts

- Classic remains the default. Preserve its DSP, EMA, chart and reference lookup.
- Acoustic formants are accepted estimates before display smoothing. Stable-mode
  jump decisions must use previous acoustic estimates, never the visual marker.
- `state.formants` remains an alias of `state.visualFormants`.
- Acquired streams and partially initialized audio contexts/nodes must be released
  after startup failure. One failed disconnect must not prevent other cleanup.
- Both locale pages implement identical lifecycle and measurement semantics.
- No dependencies, audio collection, raw corpus uploads or live deployment.
- New tests execute production inline code; browser APIs are simulated only at
  the device boundary. These tests do not establish physical device reliability.

## Implementation boundary

Add a reusable test-side page harness and production regression suite. Repair
stable-mode acceptance in both pages and add cleanup for partial capture startup
and shutdown. Avoid relocating the DSP during these fixes: existing offline
research patches depend on its function declarations and instrumentation marker.

## Acceptance

Regression tests must reproduce visual-state leakage and capture resource leaks
before fixes; pass afterwards; verify bilingual classic numerical equivalence,
EMA behavior, pause/reset and permission failure. Run all existing fast VowelScope
CI checks, adjacent ConsonantScope tests, a Jekyll build and HTTP asset checks.
Record actual results separately from unavailable remote CI and device tests.

## Subsequent milestones

1. Extract a shared pure DSP engine behind a small static-site-compatible API,
   preserving baseline fixtures and updating the replay harness in the same change.
2. Audit FIR/pole numerics; add fixed-duration ablations, filter response tests,
   failed-root diagnostics, matched-pair errors and speaker-cluster uncertainty.
3. Select a distinct legally usable corpus; freeze its protocol and independent
   holdout before evaluating or tuning. Do not invent reference measurements.
4. Add browser profiling and test actual devices where available.
5. Decide on an opt-in detector only from those results; classification remains a
   separate language-specific model, not a generic IPA distance score.

# VowelScope autonomous research roadmap

## Mandatory outcome

Independent unseen real speech, on one preregistered population: F1 MAE <=80 Hz,
F2 MAE <=160 Hz, F2 p90 <=350 Hz, detection coverage >=95%. Seek >=20 independent
speakers and >=200 annotated vowel tokens. Report speaker-cluster uncertainty,
subgroup failures and actual microphone/browser performance. Engineering progress
alone does not complete the goal. Do not lower these targets or reuse inspected
Hillenbrand partitions as blind final validation.

## Current execution: reproducible shared engine

Purpose: ensure real pages and experiments execute identical acoustic code while
preserving default classic numeric/display behavior. User authorized autonomous
incremental execution; use the existing isolated `work` checkout.

1. Add shared `vowelscope/dsp/core.js` with pure preprocessing, LPC, spectrum,
   candidate selection, voiced evidence and visual smoothing. Keep compatibility
   wrappers in both pages so historical research patches remain possible.
2. Load the actual static page dependencies in validation. Read live HTML input
   defaults; provide explicit `--smoothing legacy` for old smooth=60 replay.
   Record exact code/content digests and configuration in protocol-v2 reports.
3. Pin corpus integrity and direct new experiments outside tracked archives.
4. Verify numerical contracts, both locale golden fixtures, all fast checks and
   a real headless browser's script loading. Fake audio tests are not devices.
5. Compare raw baseline and candidate on identical development recordings, then
   investigate FIR response, constant-duration windows and root failures before
   freezing an independent candidate.

Files owned by this iteration: core, both production HTML files, page-loader and
replay utilities, state/regression tests, fast CI trigger/test coverage, and these
research records. Corpus acquisition/provenance and external dataset assessment
are independent tasks with disjoint file ownership.

Acceptance for shared extraction: pre-refactor classic golden outputs unchanged;
locale consistency; research patches still execute; smoothing never feeds raw
acoustic estimates; zero-sample behavior documented without silent default change;
all checks pass. Default protocol differences must be explicit in new artifacts.

## Following research stages

- Prepare trusted blinded F1/F2 references for the newly acquired private L2-ARCTIC
  selection (24 speakers/449 candidate windows); source phone labels alone are
  insufficient. Preserve the pending queue and predeclare final eligibility.
- Correct remaining numerical/lifecycle issues in focused, test-first iterations.
  Exact-zero interpolation is now measured (negative DEV accuracy result); the
  rate-scaled FIR passes sampled coefficient budgets and retains existing DEV
  metrics. Keep both isolated; increasing FIR support has measured host costs.
- Measure FIR pass/stop bands, boundary effects, invalid roots and constant-duration
  ablations; pair comparisons and speaker-cluster confidence intervals.
- Freeze the independent dataset, references, exclusions, sample population and
  candidate hash before final predictions. Failed final evaluation requires a new
  unseen confirmatory population for a revised candidate.
- Run desktop/mobile microphone protocol with measured sampling rate, processing
  p95/p99, missed 75-ms hops, transitions and cleanup. CI timing is not device timing.
- Produce a reviewable release candidate only from supported evidence. Keep classic
  default and generic IPA references separate from language-specific classification.

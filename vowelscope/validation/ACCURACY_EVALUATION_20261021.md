# Frozen accuracy evaluation — 2026-10-21

**Result: the offline candidate meets the four aggregate point targets on reused
DEV recordings. Independent accuracy and physical-microphone validation remain
unrun.** Classic remains the production default.

## Actual annotated recording comparison

The frozen runner replayed Hillenbrand (1995) WAVs against the source's published
F1/F2 annotations: 275 eligible tokens, 23 speakers, deterministic DEV partition.
These speakers have already informed development; this is a reproducibility and
baseline comparison, not an unseen confirmatory test. Published formant annotations
also carry measurement uncertainty.

| Metric | Classic acoustic baseline | Adaptive FIR/pole candidate | Target |
| --- | ---: | ---: | ---: |
| Detected / eligible | 263 / 275 | 264 / 275 | — |
| Coverage | 95.64% | 96.00% | >=95% |
| F1 MAE | 36.830 Hz | 31.426 Hz | <=80 Hz |
| F2 MAE | 148.904 Hz | 138.495 Hz | <=160 Hz |
| F2 absolute-error p90 | 496.750 Hz | 251.766 Hz | <=350 Hz |
| F2 errors >500 Hz | 26 | 20 | report |

Errors use detected pairs; coverage includes every eligible token. On the same
259 commonly detected tokens, baseline/candidate F1 MAE is 34.525/31.179 Hz,
F2 MAE 144.951/129.597 Hz and F2 p90 314.250/236.432 Hz. The common subset's
100% detection rate must not replace whole-population coverage.

Candidate speaker-cluster bootstrap 95% intervals (2,000 replicates, seed 20261013):
coverage 93.04–98.55%, F1 MAE 23.314–41.015 Hz, F2 MAE 100.869–181.528 Hz,
F2 p90 159.707–600.877 Hz. Aggregate point targets do not erase this uncertainty.

Subgroup failures remain: girls' coverage falls from 46/48 to **43/48 (89.58%)**;
adult women's candidate F2 MAE/p90 remain **190.126/526.364 Hz**. Adult men's
F2 MAE increases from 73.301 to 86.286 Hz. No general reliability or pronunciation
classification accuracy is established, and no production promotion follows.

## Frozen provenance and reproduction

- Algorithm/evaluator Git: clean `33c691a5da285b3802ac08c3aaf3953849070942`.
- Source archive SHA-256: `2560548591e3a726c88549b6dc9d226995616c26874d601c69fee8b9eee9d730`.
- Actual Chinese page plus shared DSP, classic mode, **acoustic** measurement,
  HTML smoothing default 58, 75-ms hops; baseline 512/11025 Hz, candidate
  `pole14_fs12000_poly_adaptive` 512/12000 Hz. This changes nominal duration.
- Exact page/patch/runner digests, runtime versions, per-vowel/cohort aggregates,
  denominators and uncertainty are in the [immutable aggregate JSON](ACCURACY_EVALUATION_20261021.json).
- Prospective plan and original aggregate are retained privately as
  `/workspace/research-results/accuracy-20261021-{plan,dev}.json`.

Run at the frozen revision, with a new external output filename:

```sh
python3 vowelscope/validation/run_phase3_poles.py \
  --archive-cache /workspace/research-cache/h95-alldata.zip \
  --out /workspace/research-results/new-frozen-dev-comparison.json \
  --variants original_acoustic pole14_fs12000_poly_adaptive
```

Later tooling commits do not replace this algorithm revision. Do not rerun final
independent predictions merely to reproduce DEV.

## Independent review handoff

The separate pinned L2-ARCTIC queue contains 449 pending candidates from 24 speakers
and 72 recordings, including 49 annotation warnings. **Reviewed F1/F2 count is zero;
no VowelScope predictions have run on this population.** Phone intervals are not
frequency references. The prospective plan freezes candidate digests but explicitly
leaves final eligibility unfrozen and predictions disallowed.

`reference_review.py` now exports a private blank CSV, instructions, plan/queue
digests and a blank custodian attestation. Its importer checks unchanged source
hashes/identities, all candidate dispositions, finite reviewed measurements and
provenance, predeclared exclusion reasons, and >=20 speakers / >=200 included
references. It preserves exclusions in a private audit and writes a separate
manifest only after completeness checks pass. These checks cannot certify the
reviewer's expertise or declarations.

Use the [review preparation instructions](../docs/OPEN_CORPUS_PREPARATION.md).
Qualified blinded reference review is the remaining accuracy prerequisite;
desktop/Android/iOS microphone evidence is a separate prerequisite. This is a
DEV result and review handoff, not the final validation report.

## Tooling verification

The actual private export verified all 146 retained source-file hashes and all
449 rows remained pending with blank F1/F2/time references. Pending custodian
import and direct queue replay both rejected without a reviewed manifest or
independent predictions. The readiness record is retained privately at
`/workspace/research-results/accuracy-20261021-readiness.json`.

98 Node tests and 39 Python tests passed, alongside both actual-page self-tests,
Phase 3/3b checks and syntax/configuration checks. A fresh read-only code review
identified a same-cache source-symlink acceptance issue; its regression failed
before the fix and passed after checking both leaf and ancestor components.
The reviewer also confirmed existing evaluator compatibility using synthetic
PCM silence, not independent recordings. These tests validate tooling, not
acoustic accuracy, reviewer expertise or physical microphones.

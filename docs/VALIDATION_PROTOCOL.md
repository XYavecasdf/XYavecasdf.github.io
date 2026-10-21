# Independent validation protocol and frozen engineering gates

Status: engineering targets and metric rules fixed; **final dataset/candidate not
yet frozen and no final evaluation has run**.
Do not treat DEV results or engineering tests as final validation.

## Population and eligibility before final prediction

Select legally acquired independent English speech with >=20 previously unused
speakers and >=200 well-annotated vowel tokens, meaningful vowel-class coverage.
Hillenbrand train/dev/previous-test recordings are excluded from confirmatory
validation. Freeze exact archive/version/digest, licensing scope, speaker partition,
phonetic contexts and inclusion/exclusion criteria before reading final references
or generating final predictions. Token eligibility cannot depend on model success.

An audio/annotation pair needs valid timing and reviewed finite positive F1/F2
references for the specified window. Report malformed/missing references separately
with reasons fixed before predictions. Human correction uses a declared blinded
workflow and adjudication; Praat/model agreement alone is not physical ground truth.
No false invented labels, automatic exclusion of difficult voices or speaker-trait
inference to select a model. For a held-out corpus with sub-200 eligible tokens,
do not silently reduce the minimum; collect or acquire additional independent data.

## One predefined population, four simultaneous targets

| Metric | Point-estimate engineering target | Denominator |
|---|---:|---|
| Coverage | >=95% | Every eligible token, including failed detections |
| F1 MAE | <=80 Hz | Valid detected reference-estimate pairs |
| F2 MAE | <=160 Hz | Same valid pairs |
| F2 absolute-error p90 | <=350 Hz | Same valid pairs; nearest-rank percentile |

Report paired counts and missing detections alongside errors. A token estimate is
the median of newly accepted unsmoothed frames in the frozen reference window;
failed/stale/unaccepted frames cannot masquerade as detections. Keep visual EMA
out of acoustic errors. Compare baseline/candidate on identical eligible tokens
and also identical detected-pair subsets; label each denominator explicitly.
Report F1/F2 medians, p90, extreme F2 errors >300/>500 Hz and a distribution summary.

## Statistical and subgroup rules

Use 2,000 deterministic speaker-cluster bootstrap replicates (seed 20261013),
resampling speakers with replacement and retaining all selected speakers' tokens.
Report percentile 95% intervals, speaker/token counts, undefined zero-detection
replicates and seed. Use the same draws for paired variants. These intervals
describe uncertainty; they do not make a biased or tuned population independent.
Targets above remain simultaneous point-estimate gates; uncertainty and material
subgroup failures must be investigated before a general reliability claim.

Stratify by supplied cohort labels, F0, vowel class and recording condition when
available, without inferring personal traits. Small/missing groups are marked
insufficient/unavailable. Inspect coverage and tails, not just means. Severe
group failure cannot be concealed in aggregate acceptance.

## Candidate and information firewall

Before final execution, freeze exact Git SHA, clean/dirty state, all source content
digests, analysis sample rate/window, LPC order, bandwidth, resampler, gates, window
alignment, language UI and numerical tolerances. Development thresholds come only
from training/development data. Run final predictions once and save immutable
provenance. If final criteria fail, report failure and return to DEV; a revised
candidate requires a new unseen confirmatory population.

## Actual devices and reproducibility

Follow [`DEVICE_TEST_PROTOCOL.md`](../vowelscope/docs/DEVICE_TEST_PROTOCOL.md).
Measure negotiated capture/sample rates, sustained vowels/transitions, permissions,
stop/start/navigation, CPU distributions, delayed hops and long sessions. Processing
hop is 75 ms; report p95/p99/max and overruns relative to this budget. Synthetic
Chromium capture and desktop emulation do not satisfy physical desktop/mobile tests.

Publish only aggregate statistics and reproduction/provenance. Keep raw audio,
speaker identifiers and token-level traces outside the public checkout. No final
report file is created while these mandatory criteria are unrun.

## Current prerequisites

The active open-data route has prepared L2-ARCTIC recordings and manual phone
intervals (24 speakers, 72 recordings, 449 candidate windows) for private
noncommercial research. **Reviewed F1/F2 references are still missing**; no final
evaluation has run. Follow the [preparation/review protocol](../vowelscope/docs/OPEN_CORPUS_PREPARATION.md)
to create a separate reviewed manifest, preserve blinding and verify final
eligibility. The candidate window count is not a paired-reference denominator.

The VTR/TIMIT route remains conditional on verified acquisition and rights; its
mirror license does not settle upstream terms. See the [dataset assessment](../vowelscope/docs/INDEPENDENT_DATASET_ASSESSMENT.md).
Cloud Chromium has no microphone input and returns `NotFoundError`; physical
desktop/Android/iOS validation needs an external device operator. These are
unmet prerequisites, not passed tests.

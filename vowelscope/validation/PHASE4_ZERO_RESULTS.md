# Phase 4 exact-zero interpolation control — DEV only

2026-10-14. Outcome: **numerical correction verified; no accuracy promotion**.
The zero-safe variant remains offline; production shared DSP and both locale
pages remain unchanged. No independent final evaluation or device test occurred.

## Frozen method and provenance

Exact clean source: `093516db58d8be4c5a7a414c3bca89a8dec82d20`.
Verified Hillenbrand archive SHA-256:
`2560548591e3a726c88549b6dc9d226995616c26874d601c69fee8b9eee9d730`.
Original published F1/F2 references, previously inspected DEV speakers only:
275 eligible tokens /23 speakers. Classic acoustic replay, live slider default 58,
512 samples at 11025 Hz (46.44 ms nominal window), same LPC/gates/windowing.

The offline `linear_zero_safe` patch replaces the second interpolation endpoint's
boolean fallback with a nullish fallback. A valid zero is retained; missing values
still fall back to the first endpoint. This control is for finite PCM input, not
a new input-sanitization policy. No antialias filtering is added.

The known triangle fixture's correct RMS is sqrt(3/8), approximately 0.612372;
unpatched classic yields 0.75. The correction matches the analytic cycle exactly
in both locales. Nonzero-input raw/y/RMS match classic bit for bit at
16/44.1/48/96 kHz; silence/short-buffer contracts pass. These numerical observations
do not establish speech-reference accuracy.

## All-token and common-detection results

| Variant | Paired /275 | Coverage | F1 MAE Hz | F2 MAE Hz | F2 p90 Hz | F2 error >500 Hz |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Original acoustic | 263 | 95.64% | 36.830 | 148.904 | 496.750 | 26 |
| Zero-safe linear | 263 | 95.64% | 35.593 | 152.385 | 575.000 | 27 |

Original baseline reproduced archived raw acoustic metrics. Errors condition on
the paired detections; coverage includes every eligible token. Equal detection
counts hide a change in which tokens are detected: **262 common detections**.
On these identical common tokens, F1 MAE is 35.299 ->35.704 Hz and F2 MAE
149.301 ->152.631 Hz; F2 p90 remains 496.750 ->575.000 Hz. The apparent all-token
F1 improvement is therefore not supported on the identical detected population.

By vowel, /eɪ/ coverage changes 21/23 ->22/23, while /ɑ/ changes 19/23 ->18/23.
/ɑ/ F2 MAE changes 222.237 ->268.347 Hz on those different detected subsets.
Both gains and losses are retained; no difficult tokens were silently omitted.

| Supplied cohort | Tokens | Paired, both variants | F2 MAE original ->zero-safe Hz | F2 p90 original ->zero-safe Hz |
| --- | ---: | ---: | --- | --- |
| Adult men | 96 | 94 | 73.301 ->79.779 | 89.000 ->106.250 |
| Adult women | 84 | 79 | 192.506 ->195.991 | 703.500 ->703.500 |
| Boys | 47 | 44 | 209.136 ->209.420 | 834.250 ->834.250 |
| Girls | 48 | 46 | 170.902 ->171.310 | 678.000 ->678.000 |

Cohort counts alone do not guarantee identical token membership. Supplied corpus
labels are used; no user characteristics were inferred for model selection.
Existing female/child tails and low subgroup coverage remain unresolved.

## Uncertainty and computation

2,000 speaker-cluster bootstrap replicates, seed 20261013, all tokens per sampled
speaker. Original F2 MAE 95% interval: 107.2182–193.7111 Hz; zero-safe:
111.7039–196.2040 Hz. F2 p90 intervals: 187.5000–703.5000 and
212.2500–703.5000 Hz. These are intervals for each estimator, not a significance
test or paired confidence interval for the difference. Repeatedly inspected DEV
and small groups cannot support an independent generalization claim.

1,132 processed frames per variant. Mean CPU on this Node VM run: 1.954 ms
original, 1.864 ms zero-safe. A single timing run cannot establish a speed gain
or microphone/mobile performance.

## Decision and reproduction

Retain the isolated variant and negative evidence; do not change the live default.
A mathematically correct interpolation change alone is insufficient to improve
the downstream LPC/peak pipeline. This run does not identify the causal mechanism
behind worsened tails and does not justify new thresholds or final-set tuning.

New [aggregate](public-dataset/phase4-zero-interpolation-dev.json) preserves complete
configuration, page/patch digests, all/common denominators, vowel/cohort results,
cluster uncertainty and exact runner/dataset provenance. Earlier reports remain.
Reproduce at the source revision with a **new external output**:

```sh
python3 vowelscope/validation/run_phase3_poles.py \
  --archive-cache /workspace/research-cache/h95-alldata.zip \
  --out /workspace/research-results/new-zero-control.json \
  --variants original_acoustic original_acoustic_zero_safe
```

The runner refuses this new experiment without an external output path and rejects
existing outputs. No WAVs, speaker IDs or token traces are published. Independent
references and physical microphones remain required for the primary goal.

# L2-ARCTIC private reference preparation

2026-10-13: **recordings acquired; trusted formant references still missing**.
No acoustic predictions or final accuracy evaluation have run on this population.
The user selected publicly available vowel/speech data rather than organizing a
new recording collection. The required accuracy and physical-device gates remain.

## Source and permitted scope

Use [L2-ARCTIC's public distribution](https://github.com/tienanhdev1401/l2arctic_data),
pinned to `81b4ebae862d238ca58e0367d308b9787511e369`. Its documentation describes
version 5, 24 speakers of English as a second language, six first-language groups,
44.1-kHz mono recordings and manually reviewed phone intervals. Source citation:
Zhao et al., *L2-ARCTIC: A Non-native English Speech Corpus*, Interspeech 2018,
[DOI 10.21437/Interspeech.2018-1110](https://doi.org/10.21437/Interspeech.2018-1110).

The distribution carries **CC BY-NC 4.0**. Attribution and noncommercial use are
required; public availability does not imply unrestricted commercial use. This
acquisition is private noncommercial research. Retain the complete source README
and LICENSE alongside the recordings. Audio, speaker IDs, interval annotations
and token-level references stay outside the public checkout.

This is a third-party distribution. Official documentation destinations
`https://psi.engr.tamu.edu/l2-arctic-corpus/` and `https://l2-arctic.github.io/`
returned proxy tunnel 403 in this environment. The stated version/license were
verified in the pinned distribution, not independently confirmed on those sites.
No proxy, credentials or network restrictions were changed.

Fixed documentation SHA-256, checked before recording acquisition:

| File | SHA-256 |
| --- | --- |
| README.md | `2830cad62115ac138de891b581d0678dd8504438418a607086727a2cf2d0f53a` |
| LICENSE | `b1d636fddd729d8185d89af1e41e21a311866fcf3d4040cc4906a64837d0f218` |

## What was actually prepared

The new stdlib utility `validation/prepare_l2arctic.py` selects the first three
lexicographically ordered **manual** TextGrids for each of the 24 documented
speakers. This rule was chosen before any acoustic model ran. Forced-alignment
`textgrid/` files are not substituted for `annotation/` files.

It downloaded and paired **72 unique PCM WAV recordings**, totaling **21,082,610
audio bytes**, with those manual annotations. Parsed phone intervals must match
their declared count and sequential indices, be finite and chronological without
overlap, and fit within the paired recording. The tool interprets perceived phones
from substitutions, retains additions, excludes deleted speech and flags accented
or corrected labels for review. Two source labels use uppercase `S`; operation
markers are case-insensitive. Unknown/inconsistent operations stop preparation.

The predeclared duration requirement is at least 100 ms. It yielded **449 candidate
windows**, with 12–26 per speaker, including **49 annotation-warning candidates**.
Before any prediction, 399 shorter vowel intervals and 1,547 non-vowel/ambiguous
intervals were excluded from this candidate queue. These counts describe this
selection, not all vowels in the corpus or detector failures. Long windows and the
first-three-file rule limit representativeness; connected accented speech differs
from isolated Hillenbrand vowels and actual practice microphones.

| Perceived phone | Candidate windows |
| --- | ---: |
| AA | 17 |
| AE | 36 |
| AH | 33 |
| AO | 21 |
| AX | 2 |
| AY | 63 |
| EH | 81 |
| ER | 47 |
| IH | 39 |
| IY | 51 |
| OW | 34 |
| UH | 3 |
| UW | 22 |

Rare/missing classes and diphthong/rhotic timing need explicit review. **449 is not
the final count of eligible tokens with trusted F1/F2.** Corpus speaker IDs are
distinct; a custodian must still verify the final population's non-overlap with
development use and adequate class/group coverage.

## Reproduce acquisition without scoring

Run from the checkout root, with a new external cache and output filename:

```sh
python3 vowelscope/validation/prepare_l2arctic.py \
  --cache /workspace/research-cache/l2-arctic-private \
  --out /workspace/research-cache/l2-arctic-private/reference-review-queue.json \
  --files-per-speaker 3
```

The output must be a new file directly inside the cache, outside the checkout.
Limits are 3 MB per recording, 500 KB per annotation and 160 MB selected audio.
Pinned directory metadata must identify the exact commit and a complete listing.
Each first HTTPS download saves an exclusive receipt with URL, commit, SHA-256 and
byte count. Reuse verifies that receipt; missing receipts, changed bytes or source
mismatch stop the run. Old unverified cache files are never adopted. This protects
ordinary cache integrity and source confusion; it is **not** an independently
signed upstream checksum or protection against replacing both receipt and bytes.

The private queue records source-file hashes, selection rules, preparation code
digest and actual preparation Git context, independently of the dataset revision.
Reusing the verified cache reproduced the same candidate counts without downloads.
The preserved preparation artifact is
`/workspace/research-cache/l2-arctic-81b4ebae-verified/reference-review-queue-02.json`.
Earlier queues were preserved rather than overwritten.

## Reference review before independent evaluation

Every queue row has `gt_f1_hz`, `gt_f2_hz` and `gt_time_s` set to **null**, with
`reference_review_status: pending`. Its proposed midpoint is only an annotation
aid. The source supplies human-reviewed **phones**, not human-reviewed **formants**.
No VowelScope estimates, unchecked Praat results or phone-class averages were
substituted as ground truth. `benchmark.mjs` rejects a preparation queue and any
selected row carrying a status other than `reviewed`.

1. Before predictions, a custodian freezes selection/review rules and records the
   final evaluator/candidate revision and configuration. Keep model predictions
   hidden from reference reviewers and final frequency labels hidden from tuning.
2. Qualified reviewers inspect the paired speech/spectrogram independently of
   VowelScope. Record an exact reference time/window, positive finite F1/F2,
   review method, uncertainty and evidence; adjudicate disputed measurements.
   Automatic proposals can assist only if subsequently reviewed. Diphthongs,
   rhotics, accented labels and unusable recordings require predeclared treatment.
3. Preserve the original pending queue. Produce a separate reviewed reference
   manifest with review provenance, every row's reviewed status and corresponding
   source hashes. Use `kind: acoustic_reference_manifest`, not the queue kind.
   Verify >=20 previously unused speakers and >=200 eligible paired references.
   Log reference exclusions before prediction; never exclude detection failures.
4. Run the frozen evaluator once, covering all four targets on the same eligible
   population, with coverage, subgroup results and speaker-cluster uncertainty as
   specified in [the validation protocol](../../docs/VALIDATION_PROTOCOL.md).

Reference expertise and actual desktop/Android/iOS microphones remain external
prerequisites. This preparation clears the raw-recording route; it does not clear
those gates or justify changing the live default detector.

## 2026-10-21: private review packet and checked import

The frozen accuracy plan is retained outside the checkout as
`/workspace/research-results/accuracy-20261021-plan.json`. It records the queue's
SHA-256 and the clean algorithm revision `33c691a5`; it does **not** authorize
independent predictions before reviewed eligibility is frozen.

Export the original queue into a **new** private directory:

```sh
python3 vowelscope/validation/reference_review.py export \
  --queue /workspace/research-cache/l2-arctic-81b4ebae-verified/reference-review-queue-02.json \
  --plan /workspace/research-results/accuracy-20261021-plan.json \
  --out /workspace/research-results/accuracy-20261021-review
```

Read the generated `README.md`. `reviews.csv` contains all 449 candidates with
stable identity/digest columns and blank frequencies/measurement times. Work on
a copy; do not edit the original queue or remove excluded rows. The exact audio
paths resolve relative to the original private cache, with manual TextGrids in
each recording's corresponding annotation directory. This exporter computes
hashes only; it does not generate frequency proposals or predictions.

A qualified reviewer/custodian must freeze a dated reference protocol before
inspecting formants, including exact window/timing, uncertainty and adjudication
rules. Follow the blinded workflow above. Every row needs `include` or `exclude`,
reviewer, method, evidence and adjudication (`not_disputed` or an adjudication
record). Included rows need an exact reference time in the annotated interval,
positive F1<F2 and finite nonnegative F1/F2 uncertainty. Record actual analysis
settings/window and source evidence in the method/evidence fields. Do not confuse
the proposed midpoint, perceived phone or an automatic estimate with reviewed GT.

Exclusions are limited to predeclared `unresolvable_formants`,
`unusable_recording`, or `incorrect_phone_interval`, with the detailed reason in
evidence and all measurements blank. Do not use these as a way to omit difficult
voices, rare phones, warnings or detector failures. Wrong intervals must be
documented/excluded rather than silently changed. If fewer than 200 usable
references or 20 speakers remain, obtain additional independent data under a new
prospective selection; do not lower the minimum.

The separate `attestation.json` begins with blank identity/evidence and false
declarations. The custodian completes it only after verifying previously unused
speakers, blinded reference review and no predictions yet; reference the private
dated protocol evidence. Software checks cannot establish expertise, verify a
human declaration or make an unreliable measurement trustworthy.

Import the completed files into a **new** manifest directly in the cache, so the
existing replay evaluator can resolve unchanged audio paths:

```sh
python3 vowelscope/validation/reference_review.py import \
  --queue /workspace/research-cache/l2-arctic-81b4ebae-verified/reference-review-queue-02.json \
  --plan /workspace/research-results/accuracy-20261021-plan.json \
  --reviews /workspace/research-results/accuracy-20261021-review/completed-reviews.csv \
  --attestation /workspace/research-results/accuracy-20261021-review/attestation.json \
  --out /workspace/research-cache/l2-arctic-81b4ebae-verified/reviewed-references-01.json
```

The importer rejects missing/duplicate/edited rows, pending decisions, invalid
references, changed source hashes, absent audit declarations and insufficient
population. It preserves all exclusions and source/review/plan digests privately.
Successful import means complete review records, **not** a passed accuracy test.
Freeze final eligibility and the exact evaluator/candidate configuration before
one final replay, following `VALIDATION_PROTOCOL.md`. This step must also retain
the actual-phone grouping, since generic nearest-IPA agreement is not phoneme or
pronunciation accuracy. No reviewed manifest or independent predictions were
created during packet preparation.

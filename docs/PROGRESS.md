# VowelScope autonomous goal progress

## 2026-10-22 — All-figure factual review

Audited both locale canvas plots, all 28 category-driven tongue/lip poses,
language inventory comparisons and both research FIR figures. Found misleading
articulatory labels on the acoustic plot and a concrete Nyquist-domain guide
error in both 16-kHz research panels. Renamed the plot and frequency headings,
made the formant trajectory and fixed-jaw/front-lip-view concepts explicit,
and regenerated corrected research figures from unchanged archived JSON.
Original PNGs and data remain intact; no DSP or pose mapping changes were made.

No additional category reversal was established. 121 Node /39 Python tests,
bilingual self-tests, Phase 3/3b and Jekyll build passed. Actual Chromium checked
28 poses and all 36 language-selector combinations per locale at desktop/mobile
sizes. The actual plot artists reproduced then passed the Nyquist-guide check.
Fresh review found no additional Important/Critical issues. See
[the figure audit](../vowelscope/docs/FIGURE_FACT_CHECK_20261022.md) for inventory,
findings and source-access limits. This is not expert anatomical certification,
phonetic listening or an independent accuracy/device result. Corrections remain
local; no publication was performed in this review.

## 2026-10-22 — Complete reference-sound repair

Confirmed 11 missing recordings in the published 17-recording viewer. A code
index swap was not established; the user's broader phonetic-quality concern
was not resolved by filename matching. Replaced the active collection with
28 explicitly cataloged community IPA recordings from pinned
`serverhiccups/ipa-chart` revision `fc6270c08a8aed6141cbe04595db8801ba767b49`.
Each symbol has an explicit lookup and a distinct same-site MP3 teaching
derivative; audio CC BY-SA 3.0 and catalog CC BY-SA 4.0 credits are retained.
Original OGGs and all research/private recordings remain outside the checkout.

121 Node / 39 Python tests, bilingual self-tests, Phase 3/3b and Jekyll build
passed. Actual Chromium HTTP playback completed all 28 examples in both locales
without mocked audio responses, with response hashes checked. Rapid switching,
Stop, reduced motion and 1280/390/320-pixel layouts passed. Fresh review found
no Important/Critical issues. See [repair details](../vowelscope/docs/REFERENCE_SOUND_REPAIR_20261022.md).
These establish mapping and technical playback, not expert phonetic correctness
or physical-device verification. DSP/defaults and the blocked independent
accuracy goal are unchanged.

## 2026-10-21 — Requested factual review before publication

Reviewed both locale pages and the reference viewer's phonetic categories,
anatomy illustration, numerical claims and source/privacy wording. Corrected
[ə, ɐ] from an asserted neutral lip posture to unspecified rounding, hiding fixed
lip shapes; moved the illustrative tongue dorsum below the drawn palate; used
phonetic brackets for generic phone examples; limited “all IPA vowels” language
to 28 basic reference symbols. The UI now explicitly separates illustrative
F1/F2 from the recordings' unmeasured formants and from universal IPA frequencies.

Rechecked all 19 retained source hashes (17 WAVs, README and CC0 license). Creator
authorship/license statements are supported; official endorsement and independently
reviewed phonetic quality are not. These limits are visible in both locale UIs,
alongside the existing 17-recording / 11-missing split. Local-only wording now
specifies microphone processing while disclosing remote audio requests.

Tests: 118 Node / 39 Python passed, with new unspecified-rounding and sampled
palate-clearance regressions. Chromium desktop/mobile checks passed; a fresh
read-only factual review found no Important/Critical issues and two minor wording
omissions were fixed. See [the factual audit](../vowelscope/docs/REFERENCE_FACT_CHECK_20261021.md)
for evidence, references and limits. No DSP change, push or publication occurred.

## 2026-10-21 — Interactive articulatory references

User requested a side-view tongue animation and open human IPA sound on reference
vowel selection. Both locales now use a shared `reference-player.js`/CSS viewer:
all 28 IPA categories have an illustrative tongue/lip transition; repeated clicks
replay, rapid switching cancels earlier playback, and reduced motion is supported.

17 exact symbols use Ruben Schachtenhaufen's creator-published CC0 recordings at
pinned `81c8086257d84f5e434790603bb39b901df8143c`. Authorship/license and all
17 PCM WAV files were verified over HTTPS; hashes/formats are recorded in
`vowelscope/reference-audio-sources.json`. Files stream remotely on user action;
no recordings were bundled in the checkout. Other 11 symbols explicitly report
unavailable verified audio; no neighbor vowel or synthetic voice is substituted.
See [source/coverage details](../vowelscope/REFERENCE_AUDIO.md).

Playback cancels active/pending capture to keep reference output out of measured
audio; starting capture stops playback. This is a teaching UI change, not an
accuracy result. Shared DSP/classic default and the outstanding independent
reference/device prerequisites remain unchanged. Real Chromium verified both
locales, all selections, reduced motion and 1280/390/320-pixel layouts, using
verified WAV bytes via network interception; direct live-host browser playback
and physical sound/microphone hardware were not established by that check.
Verification passed: 114 Node tests (16 new reference-player cases), 39 Python
tests, bilingual benchmark self-tests, Phase 3/3b and source/configuration checks.
Fresh read-only review reported no Important/Critical findings. Work remains on
the local development branch; no push, default detector promotion or deployment.

## 2026-10-21 — Frozen accuracy comparison and review handoff

At the user's request, reran actual annotated DEV WAVs on clean algorithm/evaluator
`33c691a5da285b3802ac08c3aaf3953849070942`, after saving a prospective private
evaluation plan. Baseline/candidate coverage is 263/275 vs 264/275; F1 MAE
36.830/31.426 Hz, F2 MAE 148.904/138.495 Hz and F2 p90 496.750/251.766 Hz.
These are the same reused 23-speaker DEV population, not an independent pass.
The 259 common detections, bootstrap intervals and subgroup failures are in
[the accuracy report](../vowelscope/validation/ACCURACY_EVALUATION_20261021.md).
Girls' candidate coverage remains 43/48; adult-women F2 tails remain unresolved.

New stdlib `reference_review.py` exports a private blank CSV and checks completed
blinded reference imports without running DSP. It verifies original queue/source
hashes, every candidate's identity/disposition, reference/provenance completeness,
custodian declarations and >=20 speakers / >=200 included references, preserving
exclusions privately. It cannot certify human expertise or declaration truth.
See [handoff commands](../vowelscope/docs/OPEN_CORPUS_PREPARATION.md).

Independent L2-ARCTIC remains 449 pending candidates / 24 speakers / 72 recordings,
zero reviewed frequency references and zero predictions. Qualified blinded review
and physical-device access remain necessary. The live default and DSP are unchanged.
The actual private packet is `/workspace/research-results/accuracy-20261021-review/`;
all 146 source-file hashes were checked, and pending import/direct queue replay
were rejected. Verification: 98 Node tests, 39 Python tests, bilingual self-tests,
Phase 3/3b and syntax/configuration checks. A fresh review's source-symlink finding
was reproduced and fixed with a passing regression; no other blocking findings.

Goal status: **independent raw recordings prepared; blocked on trusted formant
references and physical devices; mandatory success criteria remain unmet**.
Do not stop at a successful implementation or DEV comparison and call the goal done.

Preserved starting local commits: `ace05dd`, `10ef335`, `798c2c4`, based on
`c544b673c73f0234d63a23fafe892cba5f53171d`. Remote main was still at that baseline
when checked through the platform HTTPS Git proxy. No local work was reset/pushed.

| Mandatory condition | Current evidence |
|---|---|
| Independent F1/F2/p90/coverage targets | Unrun; L2-ARCTIC has 24 speakers /449 candidate windows, but no reviewed F1/F2 references or frozen eligible population |
| Speaker/condition fairness | Existing exploratory Hillenbrand groups only |
| Actual desktop/mobile microphone | Unrun; cloud capture has no input device |
| Engineering/reproducibility | Shared engine/protocol/integrity/provenance, open-data preparation and rate-scaled FIR research; 98 Node +27 Python tests passed; no independently validated release algorithm yet |

Completed local commits: `b43f7ba` (shared engine/lifecycle/profiling), `82cf23a`
(verified corpus/artifacts), `0219a84` (persistent protocols), `6d5af26` (review
corrections/aggregate context/cluster uncertainty). Work remains local, not deployed.
Open-data preparation and review safeguards are committed in `57fae6d`.
Additional research commits: `093516d` (zero-safe control), `7861e83` (negative
evidence/FIR audit), `adeb7b0` (rate-scaled filter and host elapsed-time profiling).

The frozen DEV-only comparison completed on exact clean `6d5af26` using the
verified external archive. Results and negative group findings are in
`../vowelscope/validation/PHASE4_WINDOW_RESULTS.md`; all previous reports preserved.

The user's open-data direction produced a private CC BY-NC 4.0 L2-ARCTIC selection:
72 paired real recordings, 449 unscored candidate windows, verified cache receipts
and null frequency references. No DSP predictions were generated. Acquisition and
review instructions are in [OPEN_CORPUS_PREPARATION.md](../vowelscope/docs/OPEN_CORPUS_PREPARATION.md).

Next action: build trusted blinded references on these recordings, then freeze
eligibility/splits/candidate before final predictions. The original pending queue
must remain immutable; its windows are not yet 449 eligible reference tokens.
VTR remains a conditional alternative; its mirror license cannot settle upstream rights.
Then have a real-device operator execute the desktop/Android/iOS protocol. Cloud
Chromium has no microphone input, and fake-device profiling does not clear that gate.
Do not tune against final labels or continue repeatedly optimizing inspected DEV
merely to manufacture success. Numerical/capture/UI follow-ups stay reversible;
classic exact-zero interpolation and remaining UI duplication are documented limits.
The separately tested zero-safe control worsened DEV F2 tails and stays offline.

## 2026-10-14 — Continued numerical research

The fixed 33-tap polyphase bank fails the sampled coefficient budgets at common
44.1/48-kHz input and at 96 kHz. New offline `pole14_fs12000_poly_adaptive` uses
33/47/49/97 taps at 16/44.1/48/96 kHz; all four rates pass the predefined sampled
+/-1-dB pass /-20-dB stop targets. These are coefficient budgets, not accuracy.
On clean `adeb7b0`, actual DEV replay retains the old candidate's 264/275 coverage,
31.426/138.495-Hz F1/F2 MAE and 251.766-Hz F2 p90, with identical metric summaries.
Unresolved girls coverage 43/48 and adult-women F2 tails remain visible.

At 96-kHz input, synthetic host analysis p95 rises from 5.980 to 17.930 ms;
no >75-ms calls were observed in 200 timed calls. This is wall-clock Node VM
analysis on the cloud host, not real capture/scheduling/mobile performance.
The candidate remains offline; no HTML/shared-core/default/deployment change.
See [full results](../vowelscope/validation/PHASE4_ADAPTIVE_FIR_RESULTS.md).

Mandatory next action remains blinded formant review and physical-device access;
the new engineering evidence does not clear those blockers. Follow the resumption
requirements below, then freeze eligibility/candidate/evaluator before one final run.
See `RESEARCH_ROADMAP.md`, `EXPERIMENT_LOG.md`, `VALIDATION_PROTOCOL.md` and the
dataset/device assessment for exact contracts and external prerequisites.

## 2026-10-14 — Blocker verification and resumption requirements

The private `reference-review-queue-02.json` remains intact: 24 speaker IDs,
72 recordings, 449 pending windows, every frequency/time reference null. All
retained source hashes and the preparation-code digest were verified again.
This is no independent accuracy result.

A fresh real Chromium capability probe (no fake-media flags), on an ephemeral
secure loopback origin with microphone permission granted, found zero audio-input
devices. `getUserMedia({audio:true})` returned `NotFoundError`; `/dev/snd` is absent.
The old site server returned an empty response, so this was a standalone capability
probe, not a fresh test of the full application pipeline. It confirms the device
prerequisite remains inaccessible in the current cloud environment.

Minimum actions to resume the mandatory validation:

1. A qualified reference reviewer/custodian completes the blinded review protocol
   in `OPEN_CORPUS_PREPARATION.md`, producing a separate traceable reviewed manifest
   with >=20 previously unused speakers and >=200 eligible paired F1/F2 references.
   Keep original audio and the pending queue private and immutable.
2. An operator with real desktop and mobile microphones executes
   `DEVICE_TEST_PROTOCOL.md` and supplies the measured capture/latency/cleanup
   evidence. Synthetic input and browser emulation cannot clear this requirement.

Resume with reference quality/eligibility verification, freeze the final candidate
and evaluator, then run the predefined evaluation once. Do not manufacture labels,
claim the goal complete, or retune on these final recordings while waiting.

# Real-speech validation

Run `python scripts/run-validation.py` from the consonantscope directory. Optional `--data` uses an existing cache; `--output` directs JSON/CSV outside the published report folder.

Data: all 58 upstream AutoVOT tutorialExample/test WAV/TextGrid pairs at commit 7901092b870cde2d2e8a985deca9d01baffcecfc. Verify every file's Git blob hash. Only /p b/ targets occur in this split; no evidence for other stops or languages. Speaker identities/count and native-language metadata are not verified.

Independent targeting: from the words tier, select the word directly before ABOVE; from phones, select its initial stop and next vowel. The detector receives only PCM cut from 25 ms before the phone start to the following vowel end. Gold VOT is never passed to analyze(). This is alignment-assisted snippet analysis, not unrestricted sentence recognition. The gold tier is parsed separately for scoring, and checked for containment without changing the predetermined crop.

Frozen production detector: analysis.js, same Git blob hash as the deployed UI. No tuning on this test set. If tuning later, use separate development data and preserve this first-run baseline; do not relabel it as untouched testing.

Report rejection counts as well as conditional errors. All-case threshold success divides by all 58 cases, not accepted cases. Zero detections have null error statistics, not zero error. 10/20 ms are engineering evaluation scales; 90% coverage + 80% all-case <=20 ms is an illustrative engineering gate, not a preregistered scientific criterion. Report generation/CI success is not algorithm accuracy success.

Three conditions are the same 58 files: original, amplitude x0.25, deterministic uniform additive noise at 20 dB expected SNR. Synthetic negative controls are separate and do not establish real non-stop false-positive rates.

Recorded audio and complete TextGrid files are not redistributed. Upstream repo license is LGPL-3.0; no separate recording license identified. Scripts retrieve publicly supplied tutorial files from their pinned upstream location. Public outputs contain computed results and file identifiers.

GitHub Actions reruns tests and evaluation when relevant code changes or on workflow_dispatch. It uploads JSON/CSV as a run artifact. It does not auto-commit a fresh public report; reviewed report snapshots are published explicitly.

## AutoVOT native model comparison

`python3 scripts/run-autovot-comparison.py` performs hash-verified corpus/source/model fetch, all tests, unchanged C++ inference build and two protocols. Python 3, Node.js and g++ are required; no pip/npm dependencies. `--data` and `--source` reuse external caches, `--output` selects the report destination. Original audio and upstream source/model binaries stay outside the site repository.

Primary input is the exact original PCM16 crop used by analysis.js. Diagnostic input is the original whole waveform with the same target window. Neither reads manual VOT during inference. No training, test-set tuning or additional filtering is performed. Frontend input end is floored to an integer millisecond (<1 ms change); frame indices follow upstream wrapper convention without a 2.5 ms center adjustment.

BB uses bb_jasa.classifier.pos. Legacy PGWords weights use nattalia_jasa.classifier, copied byte-identically to .pos; the loader-required all-zero BB negative companion is ignored by positive-only decoding. Constraints are 15–250 ms positive VOT and default maximum onset 150 ms. Structured margin scores are not calibrated probabilities. The native decoder has no tested rejection rule: 58/58 outputs do not imply 100% detection.

Reports include all-case <=20 ms success and matched errors on the same 16 cases measured by the heuristic. Exact upstream training lists are absent; possible tutorial/PGWords source overlap prevents an independent generalization claim. These weights are not used by the live browser analyzer. Hash-pinned source manifest: autovot-source-manifest.json. Site: comparison.html. Derived report: autovot-comparison.json/csv.

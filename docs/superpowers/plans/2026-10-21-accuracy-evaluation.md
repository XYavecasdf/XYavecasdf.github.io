# Accuracy evaluation implementation plan

> **For agentic workers:** Use superpowers:executing-plans to implement this bounded plan inline.

**Goal:** Reproduce frozen baseline/candidate DEV accuracy and prepare a private, traceable independent reference-review handoff.

**Architecture:** Reuse the existing actual-page replay and pinned corpus cache. A stdlib Python CLI exports a blank review CSV and validates a separate completed review before creating an acoustic manifest; it never estimates formants.

**Tech Stack:** Python 3.12 stdlib, existing Node replay and unittest.

**Spec:** `docs/VALIDATION_PROTOCOL.md`, `vowelscope/docs/OPEN_CORPUS_PREPARATION.md`.

## Global constraints

- Freeze algorithm at clean `33c691a5da285b3802ac08c3aaf3953849070942`; no DSP/default changes.
- Independent population requires >=20 previously unused speakers and >=200 reviewed tokens; every candidate gets a disposition before predictions.
- Keep source recordings, identifiers, references and review outputs outside the checkout. Preserve old artifacts and use exclusive new outputs.
- DEV results do not clear independent accuracy or physical-device gates. Automatic proposals are not reviewed truth.

## Review focus

- Changed source bytes or symlinks must stop export/import.
- Missing, duplicate or edited candidate identities must stop import.
- Pending rows and incomplete/nonfinite/out-of-window measurements must stop import.
- Exclusions cannot depend on detector success; review provenance and blinded custodian attestation are mandatory.
- A valid manifest must resolve the same private audio paths in the existing evaluator.

### Task 1: Frozen DEV comparison and independent review handoff

**Files:** create `vowelscope/validation/reference_review.py`, `test_reference_review.py`, `ACCURACY_EVALUATION_20261021.md`; update preparation instructions and `docs/PROGRESS.md`.

**Interfaces:** `export_packet(queue: Path, plan: Path, output_dir: Path) -> dict`; `import_reviews(queue: Path, plan: Path, reviews: Path, attestation: Path, output: Path) -> dict`.

- [x] Run existing frozen DEV runner on original acoustic and adaptive candidate; verify clean SHA and all denominators.
- [x] Write failing real-files tests for export, complete review import and every review-focus rejection.
- [x] Run unittest; expect missing-tool assertion failures before implementation.
- [x] Implement the CLI, CSV and provenance checks without DSP or additional dependencies.
- [x] Run targeted tests; expect all pass. Run required existing repository checks; expect all pass.
- [x] Export the actual private 449-row packet; verify blank references and source hashes, and prove pending import is rejected without a manifest.
- [x] Publish only aggregate DEV evidence and handoff instructions. Obtain one fresh read-only review and address important findings.
- [x] Commit validated tooling/docs locally; leave production and deployment unchanged.

## Execution record

- 2026-10-21: frozen DEV run completed on clean `33c691a5`; private plan and result preserved in `/workspace/research-results/accuracy-20261021-{plan,dev}.json`.
- User has authorized continued execution; routine bounded implementation proceeds inline in the existing isolated branch.
- Export/import tests first failed with nine missing-tool assertions, then passed.
  Twelve final review tests cover export/import, source/plan/row integrity,
  exclusions, minimum speakers/tokens, pending references and custodian declarations.
- Actual export verified 146 source-file hashes; 449 blank-reference rows,
  24 speakers, 72 recordings, 49 warning rows. Pending import and queue replay
  rejected; no independent predictions or reviewed manifest were created.
- Fresh read-only review found one Important source-symlink issue. A same-cache
  replacement regression failed first; checking leaf/ancestor links before
  resolution fixed it. Final targeted 12/12 and Python suite 39/39 passed.
  Reviewer separately verified manifest/evaluator compatibility on synthetic
  audio only and matched aggregate/source digests; no other blocking findings.
- Final verification: 98/98 Node and 39/39 Python tests; bilingual self-tests,
  Phase 3/3b, syntax/configuration checks and source-hash verification passed.
  Keep the existing development branch locally; no integration or deployment
  is part of this accuracy-assessment request. Human-reviewed independent
  references and physical microphone evidence remain outstanding.

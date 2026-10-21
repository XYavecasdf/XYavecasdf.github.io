# VowelScope engineering instructions

Read `ARCHITECTURE.md`, `PHASE4_DESIGN.md` and the current plan under
`../docs/superpowers/plans/` before changing architecture. Phase 1–3b findings
are in `validation/PHASE*_*.md`; inspect their aggregate JSON denominators.

- Use this existing isolated cloud checkout. Do not create a worktree unless
  the user requests one. Keep local runtime/build outputs outside the checkout.
- Keep Chinese and English behavior in sync. Classic remains the default;
  experimental tracking is opt-in. Do not deploy research pole/FIR candidates
  or change thresholds without explicit scope and measured evidence.
- Acoustic state contains accepted estimates before display smoothing.
  Visual state is a separate object; `state.formants` is its compatibility alias.
  Decisions about acoustic acceptance must never read smoothed display history.
- Test changes against actual production code. Preserve the instrumentation
  marker until all consumers are migrated together. Device-boundary mocks do
  not validate real microphone, scheduling or mobile performance.
- Capture resources must be released on failure and stop; cleanup attempts
  must be independent. Keep permission errors actionable in both locales.
- No npm/pip dependency installation is needed for the current tests.
- Run fast checks from repository root: both benchmark self-tests, Phase 3/3b
  scripts, `node --test vowelscope/validation/production.test.mjs`, and the
  syntax/configuration checks in `.github/workflows/vowelscope-validation.yml`.
- The previously inspected Hillenbrand test split is not a fresh blind holdout.
  Use train/dev only for model selection; report coverage alongside conditional
  errors and distinguish common-token comparisons from all-token summaries.
- Verify corpus rights and pinned integrity before acquisition. Never commit
  source audio, private annotations or individual speaker/token traces. Publish
  aggregate metrics only, with exact source SHA, configuration and denominators.
- Full corpus runners write tracked aggregate reports by default; inspect their
  output behavior before running. Do not silently replace archived evidence.
- Historical protocol-v1 replay used smooth=60 while live HTML uses 58.
  Protocol v2 now reads HTML defaults; select `--smoothing legacy` explicitly
  for historical replay. Keep old aggregate reports immutable and compare
  configurations explicitly, with patch/page digests and true Git provenance.
- Shared production DSP is under `dsp/`; preserve the locale wrappers until all
  research consumers migrate. Fast CI must watch assets and execute every
  `validation/*.test.mjs` plus `test_*.py`. See `../docs/PROGRESS.md` for the active
  mandatory goal, independent protocol and next research action.
- Report progress and findings to the user in Chinese. Use English identifiers,
  code, commits and technical documentation. Distinguish local checks, remote
  CI, actual-device tests and live deployment; never imply unrun checks passed.

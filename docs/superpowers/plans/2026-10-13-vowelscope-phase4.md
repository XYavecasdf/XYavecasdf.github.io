# VowelScope Phase 4 First Milestone Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans to implement this plan task-by-task. The user explicitly authorized autonomous incremental execution.

**Goal:** Isolate accepted acoustic state from display feedback and recover microphone resources reliably.

**Architecture:** Keep production inline DSP and the static-site deployment unchanged. Add a reusable test-side VM harness and behavior-focused lifecycle/state regressions, then repair both locales identically.

**Tech Stack:** Browser Web Audio, vanilla JavaScript, Node.js built-in test/VM APIs, Python 3, Jekyll.

**Spec:** `vowelscope/PHASE4_DESIGN.md`

## Global Constraints

- Classic remains the default; preserve its estimator, EMA and reference lookup.
- Acoustic/visual state remain separate; `formants` aliases visual state.
- No dependencies, audio collection, raw corpus publication or live deployment.
- Execute production code in tests; simulated devices do not validate hardware.

## Review Focus

- Stable-mode large transitions: compare with acoustic history, independent of visual lag.
- Startup failure after permission: release every acquired track and context.
- Disconnect failure: attempt all remaining cleanup and clear state.
- Permission rejection or missing API: restore controls without claiming capture started.
- Locale and classic behavior: identical audio results, unchanged smoothing, reset/pause semantics.

## Task 1: Production regression contract and acoustic isolation

**Files:** Create `vowelscope/validation/page_harness.mjs`, `vowelscope/validation/production.test.mjs`; modify both `vowelscope/*index.html` locale pages.

**Interfaces:** Test harness `loadPage(page, {search, navigator, window, patch})` returns `{api, nodes}`; instrument actual page functions `state`, `processAudio`, `acceptFormants`, `startMic`, `stopMic`, `setTrackingMode`, and `setBuffer`.

- [x] Write tests for acoustic acceptance with identical acoustic histories and deliberately divergent visual histories, plus classic synthetic fixtures and locale parity.
- [x] Run `node --test vowelscope/validation/production.test.mjs`; observe failure on visual-state leakage.
- [x] Change stable jump comparisons to `state.acousticFormants`, in both locales. Do not change thresholds or classic DSP.
- [x] Run new tests and existing Phase 3/3b tests; commit isolated acceptance fix.

## Task 2: Partial capture recovery

**Files:** Modify both locale pages and `production.test.mjs`.

**Interfaces:** Preserve `startMic()`/`stopMic()` and existing state fields. Local startup resources remain available to cleanup before assignment to state.

- [x] Add startup tests injecting constructor/resume/connect failures after stream acquisition; assert tracks ended, context closed, stopped state, controls re-enabled.
- [x] Add shutdown test with one throwing disconnect; assert other nodes/context still cleaned and reading reset.
- [x] Run tests to observe actual leaked-resource failures.
- [x] Implement independent cleanup attempts and invoke them for partial startup failures and shutdown.
- [x] Run production regression suite and existing fast checks; commit lifecycle fix.

## Task 3: Audit, CI and evidence

**Files:** Create `vowelscope/AGENTS.md`, `vowelscope/ARCHITECTURE.md`; update `validation/README.md`, `.github/workflows/vowelscope-validation.yml` and this plan.

**Interfaces:** CI invokes `node --test vowelscope/validation/production.test.mjs`; no corpus download in fast CI.

- [x] Document architecture, audited counts/metrics, numerical limitations, stale publication risk and baseline SHA.
- [x] Run every fast workflow check, adjacent tests, build and representative HTTP requests; record outcomes and unrun checks.
- [x] Review the complete diff, resolve material findings, commit docs/CI, verify clean status.

## Execution record

Baseline: `c544b673c73f0234d63a23fafe892cba5f53171d`, branch `work`, clean checkout.
Existing bilingual smoke, Phase 3/3b and 30 ConsonantScope tests passed before edits.
GitHub Actions API read failed with proxy 403; no current remote-run claim.
Plan execution is inline in the existing isolated cloud checkout; no new worktree.


## Completed milestone record (2026-10-13)

- Task 1 committed as `ace05dd`: four locale-specific acceptance failures
  reproduced and then passed; classic synthetic baseline remains exact.
- Task 2 committed as `10ef335`: 12 startup failures and two interrupted-cleanup
  failures reproduced and then passed. Six initialization stages are covered in
  each locale. Device test streams are fresh on restart, with live/ended state.
- Task 3 adds architecture/AGENTS guidance, CI integration, actual default-slider
  golden fixtures and this record. Corrected the truncated Phase 1 archive hash
  in prose against the existing aggregate JSON; no verification check was relaxed.
- Final local check: 29 production tests + 30 ConsonantScope tests = 59 passed,
  zero failed/cancelled/skipped. Both source smoke checks, Phase 3 synthetic
  root/state checks, all six Phase 3b variant checks and mapping JSON passed.
- Every validation `.mjs` passed `node --check`; every validation Python script
  compiled. Node 24.19.0 / Python 3.12.14 were used locally; CI remains Node 22.
- Jekyll 4.3.4 build passed with Ruby 3.3.8. HTTP content checks passed for the
  generated homepage, CSS, feed and both production locale pages.
- Fresh independent review found no Critical/Important production defect and
  independently reproduced both locale golden fixtures from `c544b67`.
  Its two Minor test issues were corrected: fresh stream on restart and retaining
  HTML defaults when no explicit slider override is provided. The final 59-test
  suite passed after those changes. Plan status/evidence was also updated.

### Scope decisions and remaining uncertainty

Ruling: execute inline in the existing isolated `work` checkout and retain local
reviewable commits, without a new worktree or live publication — follows the
user's autonomous incremental brief — no remote change is implied.

Ruling: fix state/lifecycle defects before shared DSP extraction — avoids mixing
numerical and architectural changes — duplication remains for the next milestone.

Ruling: preserve archived waveform reports and historical smooth=60 replay — a
new default-value protocol needs separately versioned evidence — historical
visual metrics cannot be called exact live-default measurements.

The audit records further preprocessing-zero, pending capture cancellation,
mutable-corpus integrity and stale result-publication issues. They require focused
follow-up work; no new estimator is being promoted before that work. No full
corpus rerun, independent validation or browser hardware test was executed.
Remote GitHub Actions status remains unverified because the API route returned
proxy 403. No changes were pushed or deployed to the public site.

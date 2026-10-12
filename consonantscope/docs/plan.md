# ConsonantScope Implementation Plan

Goal: Deploy a functional first-version consonant experiment beside VowelScope.
Architecture: Buildless static HTML/CSS/JavaScript with local PCM audio and a separately testable analysis module.
Tech Stack: Web Audio / AudioWorklet / Canvas / FFT.js (MIT) / Node test runner.
Spec: design.md. Execution: inline, per user's explicit build-and-publish request.

Global constraints: preserve VowelScope branding; keep audio local; retain full chart; accurately qualify inventories and heuristics; no guessed recognition scores.

Review focus: permissions denied; recording interrupted or hidden; uploads too large or long; no clear stop burst; profile/context changes after recording must not relabel old audio.

- [ ] Task 1: Write failing signal tests. Implement analysis.js: analyze(Float32Array, sampleRate, context), measure(markers, context), encodeWav(samples, sampleRate), synthesize(delayMs, context), spectrum(samples, sampleRate). Run full Node test suite.
- [ ] Task 2: Implement data.js with pulmonic chart, five profiles and qualified convention notes; validate profile symbols and aspiration sets.
- [ ] Task 3: Implement index.html/style.css/app.js/recorder-worklet.js for chart, recording, import, graphs, markers, replay, trial retention, export and bilingual UI. Verify syntax and user flow.
- [ ] Task 4: Include source and MIT notices, perform available browser checks, publish additive consonantscope/ files to original GitHub Pages repository in one commit, verify live page and asset delivery.

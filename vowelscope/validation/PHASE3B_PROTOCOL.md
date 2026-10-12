# Phase 3b — LPC analysis ceiling and continuity experiments

Status: **offline research experiments**. These patches are not shipped on the normal VowelScope website. Results are only accepted after the GitHub Actions workflow completes and the aggregate JSON is published.

## Scientific hypotheses

1. **Effective analysis bandwidth:** Alter the analyzed LPC sample rate to 9000 Hz or 12000 Hz (Nyquist 4500/6000 Hz), via a short windowed-sinc antialiasing filter. Compare with the production analysis rate, 11025 Hz, while keeping the 14th-order LPC and a 400 Hz root-bandwidth limit.
2. **Temporal candidate assignment:** Start with exactly the same 14th-order, 400 Hz bandwidth-limited poles and consider other valid F1/F2 pole pairs. Only previous accepted acoustic values are used to penalize large jumps (two tracking strengths); corpus annotations and future frames never enter a prediction.
3. **Runtime cost:** Quantify rough Node.js VM per-frame processing time, alongside coverage and acoustic error. This is not mobile browser CPU or battery usage.

## Controlled variants

| Name | Analysis rate | Pole order | Max pole bandwidth | Change |
|---|---:|---:|---:|---|
| original_acoustic | 11025 Hz | 14 | None | Production spectral-peak F1/F2 without display EMA |
| pole14_bw400 | 11025 Hz | 14 | 400 Hz | Previously tested pole-root candidate |
| pole14_fs9000_bw400 | 9000 Hz | 14 | 400 Hz | Antialiased input and changed LPC analysis bandwidth |
| pole14_fs12000_bw400 | 12000 Hz | 14 | 400 Hz | Antialiased input and changed LPC analysis bandwidth |
| pole14_bw400_track05 | 11025 Hz | 14 | 400 Hz | Continuity cost weight 0.5 |
| pole14_bw400_track12 | 11025 Hz | 14 | 400 Hz | Continuity cost weight 1.2 |

The workflow also retains the original visual reporting, pole 14 order/700 bandwidth and pole order 16/700 variants, for historical comparison. The comparison uses the **same Hillenbrand speaker-disjoint development set**, no withheld test speaker for model selection.

### Interpretation safeguards

The two altered sample rates are *not* a full Praat formant-ceiling implementation: the analysis uses 512 output samples, meaning its **physical window duration also changes**. Both keep the existing F2 search range up to 3300 Hz; the pole list is still restricted to frequencies below 4450 Hz. Thus any apparent improvement can involve changed window duration, filtering, or model placement, not just formant ceiling. A subsequent factorial ablation holding physical window duration fixed would be required to isolate a causal ceiling effect.

Temporal tracking is a candidate-pair cost, not a learned model. It can help stable vowels but can introduce lag during actual transitions/diphthongs. The study therefore measures errors and detection coverage and does **not** automatically alter the public `classic` mode.

The main report should compare **all valid acoustic pairs** as well as **identically detected sample subsets**. Error statistics conditioned on detection alone can be misleading when some variants refuse difficult samples. Adult-men/women/boys/girls subgroup differences are exploratory and can be confounded by age, F0 and recording setup.

There has been no fresh blind test set or mobile hardware evaluation. The development data has been analyzed previously; avoid tuning further thresholds on the test partition or advertising universal accuracy.

### Code and execution

- Source: [pole_ceiling_tracking.mjs](pole_ceiling_tracking.mjs)
- Tests: [test_phase3b.mjs](test_phase3b.mjs)
- Corpus runner: [run_phase3_poles.py](run_phase3_poles.py)
- GitHub Actions: [Phase 3 workflow](../../.github/workflows/vowelscope-phase3.yml)
- Aggregates: [phase3-pole-dev.json](public-dataset/phase3-pole-dev.json)

All raw WAVs and per-token measurements remain ephemeral in the GitHub Actions runner.

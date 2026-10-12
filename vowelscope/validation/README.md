# VowelScope acoustic evaluation (v0.1)

## Research Phase 3: executed acoustic/visual separation + LPC pole analysis

**[Read the measured Phase 3 results](PHASE3_RESULTS.md)** and [aggregated corpus metrics](public-dataset/phase3-pole-dev.json). Both Chinese and English webpages now keep raw accepted formants in `state.acousticFormants` and smoothed display positions in `state.visualFormants`. Original user-visible behavior remains backward-compatible.

The research-only complex-root LPC experiments have run on 275 development tokens and are validated by synthetic-pole and bilingual unit tests. **The pole algorithm is not deployed as a default detector.**

Research files: [lpc_poles.mjs](lpc_poles.mjs) · [test_phase3.mjs](test_phase3.mjs) · [run_phase3_poles.py](run_phase3_poles.py) · [GitHub Actions](../../.github/workflows/vowelscope-phase3.yml).

## Research Phase 2: completed dev experiments

**[Read measured Phase 2 findings](PHASE2_PEAK_STUDY.md)**: candidate peak audit, failed global peak reassignment, conservative peak rescue, and matched smoothing/median experiments. The strongest current finding is that removing or reducing the visual EMA materially lowers acoustic error on development recordings, but may increase on-screen jitter. Therefore visual and acoustic filtering should be separated rather than blindly setting the default smoothing slider to zero.

- [Peak candidate audit](public-dataset/peak-dev-audit.json)
- [Peak ranking and conservative guard ablations](public-dataset/peak-selector-dev-ablation.json)
- [EMA and temporal median ablations](public-dataset/smoothing-dev-ablation.json)
- Live microphone diagnostics, opt-in only: [Chinese](https://xyavecasdf.github.io/vowelscope/?lab=1) and [English](https://xyavecasdf.github.io/vowelscope/en/?lab=1)

No unsuccessful candidate-peak algorithm has been added to the default live speech detection.

## Research Phase 1: completed real-corpus experiments

**[Read measured Phase 1 findings](PHASE1_RESULTS.md).** The evaluation workflow
has executed Hillenbrand WAV replay, source-formant Oracle testing, acoustic
error attribution, independent-speaker American English model ablations, and
development-only DSP comparisons (original / FIR / experimental Burg / combined).

- [Oracle and F2 outlier diagnostics](public-dataset/phase1-diagnostics.json)
- [Language-trained classifier experiments — corpus F1/F2 and actual LPC output](public-dataset/classifier-dev-ablation.json)
- [FIR/Burg research DSP ablations](public-dataset/dsp-dev-ablation.json)
- [Original untouched production baseline](public-dataset/hillenbrand-baseline.json)

**No live-site algorithm has been changed by this experiment.** Experimental
Burg here is not a complete implementation of Praat. All reported speech
recognition figures are narrowly defined IPA **symbol agreement**, not clinical
pronunciation assessment or a general speech recognizer. Training model
selection happens on train/dev speakers; previously explored test participants
must not be presented as an untouched blind final set.


This folder implements a **local, source-code-based** benchmark for the existing VowelScope website. The runner instruments the **actual inline browser DSP code** from `vowelscope/index.html` or `vowelscope/en/index.html`; it does **not** reimplement LPC in Python or compare against the site's hard-coded IPA reference coordinates.

## What is and is not automatic

- Automatic after setup: CSV column mapping → validated local manifest → waveform replay into the real browser DSP → vowel-nucleus estimates → error tables and JSON. Dedicated Hillenbrand CI workflows also fetch the authorized public research archive ephemerally and publish **aggregated metrics only**.
- *Not* automatic yet: rights verification, licensed dataset downloads, producing expert-quality ground-truth annotations, Praat manual spot checks, and actual hardware/browser microphone calibration. Do not call the generated estimates “ground truth”.
- One GitHub Actions job runs smoke tests; separate Hillenbrand and Phase 3 jobs **do download source WAVs temporarily to runners**, evaluate them, and publish anonymous aggregate accuracy estimates. The audio is not committed or mirrored.

## Sources to start with

1. [Hillenbrand et al. (1995) corpus, hosted with permission](https://github.com/santiagobarreda/hillenbrand_et_al_1995). Includes English /hVd/ audio, multiple reference formant measurements, and `timedata.dat` with vowel and steady-state times. Convert its metadata into a CSV containing vowel intervals and matching measured F1/F2. **Check rights for your planned use first**; the repository's presence does not by itself grant every redistribution right.
2. [Common Voice](https://commonvoice.mozilla.org/): relevant for multilingual natural speech, but supplies sentence/text labels, not reliably time-aligned vowel nuclei with F1/F2 references. Obtain through Mozilla Data Collective, do not re-host the dataset, and do not attempt speaker identification.
3. [Praat Burg formant reference](https://praat.org/manual/Sound__To_Formant__burg____.html): generate reference measurements for *manually reviewed vowel intervals* when a source does not provide them. A separate Praat estimate alone is **not** guaranteed physical ground truth.

## Dataset manifest schema

Import a CSV into a local JSON manifest using `import_csv.py`. One row is one **annotated vowel interval**, not necessarily an entire word. Required columns are mapped by `mapping.example.json`. Reference acoustic values can be empty but then frequency-error statistics cannot be calculated.

```csv
filename,speaker,vowel,start,end,reference_time,f1_hz,f2_hz,f3_hz,language,split
audio/test001.wav,speaker01,i,0.20,0.54,0.38,310,2240,2850,en-us,test
```

**The CSV shown above is a schema illustration, not a real measured sample.** Reference time, measurements and time boundaries must come from the source dataset or a curated Praat annotation.

Audio must be PCM16 or float32 WAV sampled at **at least 11,025 Hz**, and must be stored beneath the manifest's parent directory (to prevent unsafe path traversal). To convert audio locally with `ffmpeg`, e.g.:

```bash
ffmpeg -i input.mp3 -ac 1 -ar 16000 -c:a pcm_s16le output.wav
```

Example local layout (not committed to GitHub):

```text
vowelscope/validation/
  benchmark.mjs
  import_csv.py
  mapping.example.json
  local/                         # ignored by git
    metadata.csv                 # your licensed annotated CSV
    mapping.json                 # your source-specific copy of the mapping
    audio/test001.wav
    manifest.json
    results/
```

Run at repository root:

```bash
python vowelscope/validation/import_csv.py \
  --metadata vowelscope/validation/local/metadata.csv \
  --mapping vowelscope/validation/local/mapping.json \
  --audio-root vowelscope/validation/local \
  --out vowelscope/validation/local/manifest.json

node vowelscope/validation/benchmark.mjs \
  --manifest vowelscope/validation/local/manifest.json \
  --page vowelscope/index.html \
  --mode classic --split test \
  --out vowelscope/validation/local/results/zh-classic.json

node vowelscope/validation/benchmark.mjs \
  --manifest vowelscope/validation/local/manifest.json \
  --page vowelscope/en/index.html \
  --mode stable --split test \
  --out vowelscope/validation/local/results/en-stable.json
```

If the source CSV already has an explicit train/dev/test split, map the `split` column. Otherwise the importer creates deterministic **speaker-disjoint** splits (70/15/15) using a hash of an opaque local speaker ID. The benchmark **defaults to test only** to avoid unintentional tuning on the evaluation set. `--split all` is for development diagnostics, not final performance reporting.

## Report metrics and interpretation

- **Coverage**: fraction of vowel intervals with a usable tracked formant estimate in the measurement window (not the ratio of detected speech overall).
- **Acoustic F1/F2 error**: mean, median, and 90th-percentile absolute error in Hz vs supplied *matching* annotated-time measurements; only count valid annotated pairs. Always report their N.
- **IPA label match**: agreement of the current nearest-reference quality with exact single IPA symbols implemented by VowelScope; diphthongs/rhotic vowels or other non-matching phonemic transcriptions are **not** counted. This is not a full speech/phoneme recognition accuracy metric.
- **Confusion counts** include misses. Report error/coverage for languages, vowels, speaker cohorts, and recording devices when that metadata is available.
- **Qualitative failures**: note LPC peak swaps, nasalization, high F0, poor signal-to-noise ratio, clipped vowel boundaries and unexpected coarticulation.

For reproducible comparisons, store the Git commit SHA, dataset version/permissions, device/microphone, analysis mode, source reference annotation method, speaker-disjoint split seed/rule, and the JSON report. Use development speakers for selection/tuning. A new untouched speaker set is needed for final generalization claims; the previously inspected test split is no longer blind.

## Automated regression gate

First generate comparable reports against **the same test speakers and exact
annotated intervals** for the previous stable version and the candidate version.
For example, run the benchmark with `--page` pointing to two different checked-out
HTML versions; you can copy an older `index.html` into a temporary local folder.
Do not tune your algorithm on the held-out test speakers.

```bash
python vowelscope/validation/compare_reports.py \
  --baseline vowelscope/validation/local/results/baseline.json \
  --candidate vowelscope/validation/local/results/candidate.json \
  --min-acoustic-pairs 30 \
  --max-coverage-drop 0.03 \
  --max-mae-increase 0.10
```

The command exits nonzero if a candidate loses more than three percentage points
of coverage or increases mean F1/F2 absolute error by over ten percent. These
are **initial regression tolerances**, not accepted scientific error limits or
a guarantee of pronunciation accuracy. It refuses to compare mismatched test
examples, corpus versions, or runs with insufficient measured reference pairs.

## Critical scientific cautions

- The existing estimator downsamples linearly without an anti-aliasing filter and uses fixed-order Levinson–Durbin LPC with heuristic spectral-peak selection; the benchmark measures these exact limitations rather than hiding them.
- The mock harness matches the numerical WebAudio time-domain buffer and calls the same production functions, but **does not simulate actual device microphone processing, browser scheduling jitter, AGC, noise suppression, or Safari lifecycle**. Repeat a subset using real phones.
- Hillenbrand contains diphthongs/rhotic vowels and a range of ages and voices. Some labels are **not one-to-one** with the 28 isolated IPA qualities in VowelScope; use the formant-error metrics on matching annotated intervals, and exclude non-comparable labels from the top-1 summary.
- If measuring with Praat, specify its Burg settings (formant ceiling, number of formants, window length, time step, pre-emphasis), compare at matching time points, and manually review a sampled subset. [Praat reference](https://praat.org/manual/Sound__To_Formant__burg____.html).
- Do not upload source audio, names, restricted corpus files, or raw dataset archives to a public GitHub Pages repository. The `.gitignore` guards local files in this validation folder only.

## Smoke tests (no corpus)

```bash
node --check vowelscope/validation/benchmark.mjs
python -m py_compile vowelscope/validation/import_csv.py
node vowelscope/validation/benchmark.mjs --self-test --page vowelscope/index.html
node vowelscope/validation/benchmark.mjs --self-test --page vowelscope/en/index.html
```

These tests prove the harness can load the page's actual estimator and reference lookup. **They do not constitute evidence of vowel recognition or formant measurement accuracy.**

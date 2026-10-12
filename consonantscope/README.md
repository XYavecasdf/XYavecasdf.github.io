# ConsonantScope v0.1

Controlled consonant timing experiments and A/B inventory comparison. Companion to [VowelScope](https://xyavecasdf.github.io/vowelscope/).

Live: https://xyavecasdf.github.io/consonantscope/

## Use

1. Compare A/B profiles; all pulmonic reference symbols remain visible.
2. Choose the independent Mandarin/English experiment, stop group and CV/VCV prompt.
3. Record one target at a time, or import a short browser-decodable audio file.
4. Inspect waveform/spectrogram, replay, and correct suggested boundary markers.
5. Confirm a trial; collect three repetitions per condition. Export WAV/CSV before refreshing.

The artificial-signal demo is a technical demonstration, not a pronunciation example. No automatic pronunciation score or phoneme recognition is implemented. Heuristic suggestions have not been validated against human speech. Signed VOT is manual; closure duration is manual and VCV-only. External reference audio resources are linked, not bundled.

## Run and test

No build or package installation required. Serve this directory on localhost or HTTPS (AudioWorklet and microphone require secure contexts).

`python -m http.server 8000`

`node --test tests/*.test.cjs`

Files: index.html, style.css, app.js (UI/lifecycle), data.js (chart/inventories), analysis.js (DSP/WAV), recorder-worklet.js (PCM), vendor/fft.js (MIT).

FFT.js source blob: c13b408614877ffbcf1f9a25b8a525f5445394ce. Source and licenses: THIRD_PARTY_NOTICES.md. No third-party model is executed. This release deliberately prioritizes transparent, editable measurements over unverified correctness judgments.

## Real-speech benchmark

[Validation report](https://xyavecasdf.github.io/consonantscope/validation/). Run `python scripts/run-validation.py` to fetch pinned upstream WAV/TextGrid pairs, verify hashes, test and evaluate the same production analysis.js. No Python packages or Node packages required. See validation/README.md for protocol and limitations. GitHub Actions automatically repeats evaluation on relevant source changes and provides JSON/CSV attachments. A successful CI run only means the validation pipeline worked; it does not mean the detector is accurate.

First untouched tutorial test benchmark: 58 /p b/ recordings, 16 measured (27.6%), approximately 50 ms conditional VOT MAE, 2/58 within 20 ms. Current automatic suggestions are not validated as reliable; use manual inspection. Audio is not redistributed.

## Pretrained AutoVOT comparison

[Model comparison](https://xyavecasdf.github.io/consonantscope/validation/comparison.html). Run `python3 scripts/run-autovot-comparison.py` with Python 3, Node.js and g++ to reproduce the baseline plus BB/PGWords positive-only native inference. The command verifies 53 pinned upstream source/model files, builds unchanged inference code in a temporary directory, and evaluates both identical cropped PCM and a separately reported whole-wave context diagnostic. No extra packages are required. Optional `--data`, `--source` caches and `--output` report directory are supported.

No model replaces the browser detector. A native decoder output is forced within a supplied target window, not evidence of successful detection. Model training-item independence is unverified; PGWords may share the corpus source. Compare all-case threshold success and the shared heuristic-measured subset, not conditional MAE alone. CI publishes both original and model-comparison JSON/CSV attachments.

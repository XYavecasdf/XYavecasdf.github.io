# ConsonantScope: sources, licenses and measurement limits

## Code integrated into this release

**FFT.js**, Copyright Fedor Indutny, 2017, MIT License.
Source: https://github.com/indutny/fft.js/blob/master/lib/fft.js
Retrieved source blob: 2026-10-12 (the source SHA is documented in README).
Modification: browser global export fallback only. The full license is below.

Permission is hereby granted, free of charge, to any person obtaining a
copy of this software and associated documentation files (the
"Software"), to deal in the Software without restriction, including
without limitation the rights to use, copy, modify, merge, publish,
distribute, sublicense, and/or sell copies of the Software, and to permit
persons to whom the Software is furnished to do so, subject to the
following conditions:

The above copyright notice and this permission notice shall be included
in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
USE OR OTHER DEALINGS IN THE SOFTWARE.

## Chart structure

International Phonetic Alphabet, International Phonetic Association:
https://www.internationalphoneticassociation.org/IPAcharts/IPA_charts_E/IPA_charts_E.html
The IPA chart is available under CC BY-SA 4.0:
https://creativecommons.org/licenses/by-sa/4.0/
The chart arrangement in data.js and its rendered table adapt the pulmonic consonant section and are likewise available under CC BY-SA 4.0. Changes: simplified cell layout, translated labels, added clickable profile highlights, separate extensions, no impossible-articulation shading. An empty cell must not be interpreted as a claim that an articulation is possible. No original chart image or third-party font is bundled.

## Scientific and teaching references (not integrated models)

- Sonderegger & Keshet (2012). Automatic measurement of voice onset time using discriminative structured predictions. JASA 132(6), 3965–3979. AutoVOT: https://github.com/mlml/autovot (positive VOT).
- Shrem, Goldrick & Keshet (2019). Dr.VOT: Measuring Positive and Negative Voice Onset Time in the Wild. https://arxiv.org/abs/1910.13255
- Tanner et al. (2026). wav2VOT: automatic estimation of voice onset time, closure duration, and burst realisation with wav2vec2. Interspeech 2026. https://github.com/james-tanner/wav2VOT
- Praat manual: https://praat.org/manual/Intro.html
- Lee & Zee (2003). Standard Chinese (Beijing). Journal of the International Phonetic Association 33(1).
- Zee (1991), Chinese (Hong Kong Cantonese), JIPA 21(1); IPA Handbook Cantonese and its published corrections.
- Martínez-Celdrán, Fernández-Planas & Carrera-Sabaté (2003). Castilian Spanish. JIPA 33(2). https://doi.org/10.1017/S0025100303001373
- University of Iowa, Sounds of Speech: https://soundsofspeech.uiowa.edu/ (external reference only; no videos/audio copied).

Inventories are pedagogical conventions, not exhaustive descriptions of every dialect. English r uses the common symbol ɹ; contextual aspiration and flaps are excluded from the core inventory. Mandarin includes initials, nasal codas and glides, explicitly flagged as an analysis convention. Spanish uses a north-central distinción/yeísmo reference.

## What the implementation actually measures

ConsonantScope's own browser heuristic uses short-time energy, normalized autocorrelation and spectral noise information to suggest positive-VOT boundaries in controlled stop-vowel recordings. FFT.js supplies spectral computation. No AutoVOT, Dr.VOT or wav2VOT weights are executed by the browser. The separate offline comparison downloads and runs AutoVOT as described below. No published error rate from those systems applies to this heuristic.

Automated markers are provisional. Signed VOT may be manually annotated; a fully voiced intervocalic stop requires defining onset within closure rather than treating continuous voicing as a fresh post-burst event. Closure starts are manually set and only reported for VCV. A release burst must be identifiable to interpret VOT. Values are not articulation estimates, phoneme recognition or pronunciation scores. Synthetic examples are artificial test signals, never native-speaker reference recordings.

STFT: 20 ms Hann window (capped at 1024 samples), next-power-of-two FFT, up to 650 displayed columns, 65 dB range relative to the strongest spectrum in that recording. Frequency shown up to min(8000 Hz, Nyquist). Time analysis: 8 kHz windowed-sinc resampling, 25 ms windows, 5 ms hop; automatic time boundaries have window/threshold uncertainty. Manual marker display resolution is 1 ms, not a claim of 1 ms accuracy.

Audio remains in browser memory. Downloaded WAV/CSV files are only created on user action. No analytics, third-party runtime scripts, server upload, persistent audio storage, or synthesized speech pretending to be reference pronunciation.

## Validation data (not redistributed)

AutoVOT tutorialExample/test, upstream commit 7901092b870cde2d2e8a985deca9d01baffcecfc. 58 publicly provided WAV/TextGrid pairs contain manual positive VOT annotations. Exact source paths and hashes are in validation/corpus-manifest.json. The repository LICENSE is LGPL-3.0; no independent recording license was identified. Validation downloads originals from upstream and publishes derived numerical evaluation only, without copying recordings or complete annotations into this repository. Only /p b/ target words occur in this split. No native-language/speaker-generalization claim is made. The data are used only to evaluate, not to tune this algorithm.


## Offline AutoVOT inference (not bundled into browser)

Comparison scripts fetch hash-pinned, unchanged AutoVOT native sources and pretrained BB/PGWords weights from mlml/autovot at commit 7901092b870cde2d2e8a985deca9d01baffcecfc into an external temporary/cache directory. Source/model copies and compiled binaries are not redistributed here. Upstream license is LGPL-3.0, including the fetched LICENSE; detailed source hashes appear in validation/autovot-source-manifest.json. The browser remains the original heuristic. No accuracy claims from the AutoVOT paper are transferred to this deployment. Training-item overlap with the tutorial test recordings has not been established.

# Independent English vowel corpus assessment

Assessment date: 2026-10-13. Initial VTR assessment below inspected documentation
only. A same-day follow-up acquired a pinned L2-ARCTIC selection: **24 speakers,
72 recordings, 449 unscored candidate windows**. Trusted F1/F2 references remain
missing and the required accuracy gate remains untested. See
[OPEN_CORPUS_PREPARATION.md](OPEN_CORPUS_PREPARATION.md) for source/license,
actual acquisition, integrity and review requirements. The initial assessment reads
documentation, a research paper, license text and repository directory metadata
only. No source WAV, corpus archive, token reference table, individual annotation
or final evaluation result was downloaded or inspected. Metadata access used the
existing network configuration; no credentials or proxy settings were changed.

## Required selection gate

The final population must contain at least 20 independent English speakers and
200 annotated vowel tokens. Every selected token must have a legally accessible
real recording, an exact vowel interval/reference window, and trustworthy paired
F1/F2 reference measurements. References must describe that recording, rather
than an IPA schematic, corpus-wide average, generated vowel or unchecked output
from another automatic tracker. Expert-reviewed measurements remain estimates
with annotation uncertainty.

Freeze the population, annotation interpretation, source hashes, evaluator Git
SHA and complete configuration before unblinding final reference values. Count
unique speakers and eligible tokens from metadata without inspecting frequencies;
do not infer token count from sentence count. A custodian must verify that final
speakers were never used for selection, tuning or diagnostic inspection. The
entire previously inspected Hillenbrand corpus is excluded from the independent
gate, including partitions previously called test or holdout.

Evaluate all four requirements together on that same frozen population:
F1 MAE <= 80 Hz; F2 MAE <= 160 Hz; F2 absolute-error p90 <= 350 Hz;
coverage >= 95%. Require complete paired references for every eligible token.
Conditional error statistics use detected paired tokens; coverage uses all
eligible tokens, including misses. Report both denominators and failure counts.
The existing benchmark uses nearest-rank p90, `ceil(0.9 * n) - 1` in a sorted
zero-indexed array. Preserve that definition in the preregistered evaluator.
Changing token exclusions, references or model after final inspection requires
a new untouched population. Actual device validation is a separate mandatory
gate described in [DEVICE_TEST_PROTOCOL.md](DEVICE_TEST_PROTOCOL.md).

## Candidate outcomes

| Candidate | Evidence inspected | Outcome for this task |
| --- | --- | --- |
| Deng et al. VTR / TIMIT | Original research paper and Microsoft agreement, available in a pinned third-party mirror; mirror README and directory listing | Strongest pending candidate for real audio and expert-reviewed trajectories. Its original core test population has 24 speakers, but eligible vowel-token count, exact audio integrity, provenance and lawful acquisition remain unverified. No acquisition authorized by this assessment. |
| Peterson & Barney 1952 | Praat's own documentation and CRAN phonTools metadata | 76 speakers / 1,520 reference observations are documented. Neither inspected source supplies matched original WAV recordings or exact vowel timing. Ineligible unless lawful original recordings and matching annotations are independently established; this is not evidence that recordings cannot exist anywhere. |
| JL-Corpus | Authors' repository README | New Zealand English audio is described, but available download is explicitly labelled unchecked/unannotated; trustworthy per-token F1/F2 and >=20 speakers were not established. Not usable for the current reference-error gate. |
| Hillenbrand 1995 | Existing project research evidence | Excluded: previously inspected corpus, regardless of split naming. |
| L2-ARCTIC (follow-up) | Pinned README/LICENSE, paired manual TextGrids and real WAVs | CC BY-NC 4.0 private research route acquired. 449 candidate windows across 24 speakers; no reviewed F1/F2, so not yet an accuracy benchmark. |

Other leads (Common Voice, LibriSpeech and CMU ARCTIC) do not become formant
benchmarks merely because recordings exist. This assessment did not establish
matched expert F1/F2 references or complete eligibility for them. No alternate
dataset is being silently substituted for the required English population.

## VTR: independently verified documentary evidence

The accessible repository is [phonetics-projects/VTRFormants](https://github.com/phonetics-projects/VTRFormants).
Its observed `main` revision was
`17ebad29b08644713e70274e15e85b08488e221f`. Subsequent documentation reads were
pinned to that revision. It is a mirror, not proof of an authorized upstream
distribution channel.

The [Deng et al. 2006 paper](https://raw.githubusercontent.com/phonetics-projects/VTRFormants/17ebad29b08644713e70274e15e85b08488e221f/ICASSP06.pdf)
states in Section 2 that 538 TIMIT SX/SI utterances were selected: 346 training
utterances from 173 speakers and all 192 core-test utterances from 24 speakers.
These are **utterance and speaker counts**, not a count of eligible vowel tokens.
Section 3 describes initial automatic trajectories followed by extensive manual
correction against high-resolution spectrograms, with local spline interpolation
and one reference frame per 10 ms. Section 4 describes independent pairwise
cross-labeling on 80 utterances to assess labeler inconsistency. This supports
expert review and documents uncertainty; it does not make the references exact
physical truth. This paper was read in memory for provenance/method metadata;
final corpus token references were not opened.

The [pinned README](https://raw.githubusercontent.com/phonetics-projects/VTRFormants/17ebad29b08644713e70274e15e85b08488e221f/README.md)
claims WAV, translated CSV and Praat TextGrid files in speaker directories. A
directory metadata read confirmed `VTR_phonlab/train` and `VTR_phonlab/test`.
It did not verify any WAV bytes, annotation values, sample rates, conversion
correctness, number of distinct speakers on disk or qualifying token counts.
The separate [VTR reader project's README](https://raw.githubusercontent.com/phbprsns/vtr-formants-python/master/README.md)
explicitly says its time offsets are guesses. Its conversion cannot establish
reference alignment without checking the original format and conventions.

The [original Microsoft Research agreement](https://raw.githubusercontent.com/phonetics-projects/VTRFormants/17ebad29b08644713e70274e15e85b08488e221f/VTRFormatDataCorpus%28MSR-LA2006-7-19%29.rtf)
is titled **“Non-Commercial Use Only”**, identifies VTR Format Data Version 1.0,
and states:

> “You may use this Corpus for any non-commercial purpose”

> “You may not distribute this Corpus or any derivative works in any form.”

It also says the recipient will not attempt to modify the corpus except to the
extent authorized by law, and reserves rights not expressly granted. Copyright
notices identify Microsoft and portions copyrighted by UC Regents. Thus the
mirror README's short noncommercial summary omits material restrictions. The
mirror's separate BSD-2-Clause LICENSE, copyrighted 2026 Phonetics Projects,
does not establish permission to relicense original Microsoft/UC data or TIMIT
recordings. A publicly readable repository alone does not resolve these rights.
Do not download the mirror's audio, redistribute converted annotations or
automatically publish results until lawful source/use terms and the planned
derived-output treatment are established. Do not assume a TIMIT audio license
alone covers VTR annotations, or the reverse. Permission for aggregate publication
must be established for the intended outputs; a license banning derivative
distribution cannot be treated as blanket authorization.

Document integrity observed through HTTPS (these are **documentation hashes**,
not corpus archive/audio hashes):

| Pinned file | SHA-256 |
| --- | --- |
| `README.md` | `a2b0041b615f1ae5121fec093de79d63c06f538611209848bc34ba46684e414d` |
| `ICASSP06.pdf` | `285308b638aff9155016361331505e6893d963351aff1813a1c0cf1b3c256bc4` |
| `VTRFormatDataCorpus(MSR-LA2006-7-19).rtf` | `183a812e4689abef0b65e7352ae32c7a738ad15140e3fbec17b2692856f63b61` |
| Top-level `LICENSE` | `feb668cfbaba8efcf75487e5f3b1e8fb079ee3b4b36ec917995e8a2df8d2d175` |

## Other inspected sources

Praat's [official source documentation](https://raw.githubusercontent.com/praat/praat/master/dwtools/manual_dwtools.cpp),
entry “Create formant table (Peterson & Barney 1952),” describes 76 speakers
(33 men, 28 women, 15 children), ten American English /hVd/ vowels and two
repetitions. Its provenance note describes a printed table supplied by Ignatius
Mattingly and subsequently downloaded from a University of Pennsylvania FTP
site. [phonTools pb52 documentation](https://raw.githubusercontent.com/cran/phonTools/master/man/pb52.Rd)
likewise describes 1,520 observations created from Praat tables. These are
reference-table descriptions, not a matching audio collection. No individual
reference rows were read.

[JL-Corpus author's README](https://raw.githubusercontent.com/tli725/JL-Corpus/master/README.md)
describes four balanced New Zealand English long vowels in emotional speech,
links audio/text downloads on Kaggle, calls a raw download “unchecked and
unannotated,” and says perceptually verified annotated access will follow.
Neither this README nor a public repository label establishes the F1/F2
references, speaker count or complete license required here.

## Initial VTR access and blockers (historical assessment scope)

All checks were read-only HTTPS through the existing environment. GitHub HTML
and `raw.githubusercontent.com` returned HTTP 200 for the sources above. Initial
guesses `bootphon/vtr` and `santiagobarreda/peterson_barney` returned HTTP 404;
these guessed paths are not evidence that those corpora are unavailable. No
GitHub API authentication or access conclusion was inferred from HTML success.

| Required destination checked | Observed response |
| --- | --- |
| `https://www.seas.ucla.edu/spapl/VTRFormants.html` | `Tunnel connection failed: 403 Forbidden` |
| `https://www.microsoft.com/en-us/research/project/vtr-formants/` | `Tunnel connection failed: 403 Forbidden` |
| `https://www.microsoft.com/en-us/download/details.aspx?id=52671` | `Tunnel connection failed: 403 Forbidden` |
| `https://catalog.ldc.upenn.edu/LDC93S1` | `Tunnel connection failed: 403 Forbidden` |
| `https://www.phonetics.ucla.edu/vowels/contents.html` | `Tunnel connection failed: 403 Forbidden` |
| `https://www.openslr.org/12` | `Tunnel connection failed: 403 Forbidden` |
| `https://www.cs.cmu.edu/~awb/ARCTIC/` | `Tunnel connection failed: 403 Forbidden` |
| `https://zenodo.org/search?q=vowel%20formant` | `Tunnel connection failed: 403 Forbidden` |
| Kaggle metadata destination `https://www.kaggle.com/datasets/matthieudelaro/speech-formants` | `Tunnel connection failed: 403 Forbidden` |

These are observed proxy tunnel failures; no request reached a page from which
current upstream availability, pricing, license or account entitlement could be
verified. They do not establish that the providers rejected a valid account.

For the VTR route, the smallest useful external action is to provide the original VTR/TIMIT
distribution/license documentation and a lawful acquisition route for this
noncommercial research use, or enable the named official metadata destinations
in environment settings. Do not supply secret values in chat. Network access
alone does not resolve licensing. Where existing terms do not cover processing
and intended aggregate publication, obtain the rights holder's written permission.
No message to a provider has been sent.

After that prerequisite is satisfied, an independent custodian can verify
recording/annotation hashes, timing semantics and at least 200 eligible vowels
from >=20 uninspected core-test speakers, create a private frozen manifest, and
run the already frozen evaluator once. Until then all four independent accuracy
targets remain **unrun**, not passed or failed.

If VTR cannot be lawfully acquired for the intended use, the concrete fallback
is a newly consented English collection from >=20 previously unused speakers
with >=200 expert-reviewed vowel tokens. The operator must supply actual
recordings and reviewed paired references under documented terms, with a
custodian withholding final labels from tuning. Generating references with
unchecked Praat settings or reusing Hillenbrand does not satisfy this fallback.

The user's subsequent preference selected publicly available data. The active
route is now L2-ARCTIC plus blinded expert formant review, rather than a requirement
to acquire VTR or organize new recordings. Original VTR restrictions remain.

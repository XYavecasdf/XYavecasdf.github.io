# Articulatory references and complete IPA audio

Both locale pages provide 28 illustrative tongue/lip positions and **28 playable
human IPA examples**. Each symbol is mapped explicitly to a descriptive source
recording, then to a unique Unicode-named MP3 served by this site. There is no
array-position lookup and no substitution of a nearby vowel.

## Source, mapping and rights

Source collection: [serverhiccups/ipa-chart](https://github.com/serverhiccups/ipa-chart),
pinned at `fc6270c08a8aed6141cbe04595db8801ba767b49`. The distribution's
[explicit catalog](https://github.com/serverhiccups/ipa-chart/blob/fc6270c08a8aed6141cbe04595db8801ba767b49/assets/symbol-data.json)
contains all 28 character/name/audio triples. The unchanged catalog is retained
in `reference-audio/upstream-symbol-data.json` with its CC BY-SA 4.0 site/data
license attribution; its SHA-256 is pinned in the [asset inventory](reference-audio-sources.json).

The [audio-specific statement](https://github.com/serverhiccups/ipa-chart/blob/fc6270c08a8aed6141cbe04595db8801ba767b49/README.md)
licenses the sound collection under **CC BY-SA 3.0** and credits **Peter Isotalo,
User:Erutoon, User:TFighterPilot and User:Adamsa123**. These are the distributor's
collective credits, not invented per-file performer assignments. The README's
older `assets/sounds` path refers to the collection now under `public/sounds`.
The site's separate CC BY-SA 4.0 license is not substituted for the audio license.

The 28 public teaching MP3 derivatives retain CC BY-SA 3.0. Full credits, original
source links, license URI and modification notice are in
[ATTRIBUTION.md](reference-audio/ATTRIBUTION.md), linked visibly in both players.
Original OGGs remain in the external source cache. The packaged MP3s are
redistributable teaching derivatives, not raw research/validation recordings.

Each original file was acquired by verified HTTPS at the pinned revision,
SHA-256 recorded and decoded as Vorbis. FFmpeg converted it to mono 44.1-kHz
MP3 using libmp3lame at 128 kbit/s. No deliberate pitch, playback-speed, vowel or
formant adjustment was applied. Lossy re-encoding changes samples and may add
codec padding. Original/derived durations, file names and hashes are all recorded.

## What this fixes and what it establishes

The previous release supplied only 17 recordings and explicitly disabled audio
for 11 symbols. The user additionally reported many mismatched sounds. Its
filename-to-symbol code did not demonstrate a numeric indexing swap, and the
17 samples had not been independently verified for phonetic realization. That
set is replaced in full; it is no longer the active teaching source.

The replacement has independent, explicit chart entries for every symbol, unique
local paths and verified file hashes. Browser checks exercise each actual MP3
and selected symbol rather than only checking source-file spelling. This
establishes mapping/coverage and functioning playback; it is not independent
expert certification that every recorded realization is perfect. Community IPA
examples are not an institutionally endorsed or unique language/accent standard.

See [the repair record](docs/REFERENCE_SOUND_REPAIR_20261022.md). The dated
2026-10-21 source/factual audits describe the previous release and are retained
as historical evidence, not the current audio inventory.

## Anatomy, privacy and measurement boundary

Tongue positions use explicit IPA height/backness/rounding categories, not an
inversion of microphone F1/F2. Shapes/transitions are illustrations with a fixed
jaw, not articulatory imaging of the recording or the user. [ə, ɐ] leave rounding
unspecified, so the fixed lip depiction is hidden. Reference phone examples use
square brackets; phonemic language-profile inventories keep slash notation.
Chart F1/F2 values are illustrative and were not measured from these recordings.

No audio is requested before a click. All sound assets load from the site's own
origin, avoiding external runtime audio dependencies. Starting playback cancels
active/pending capture; starting capture stops playback. Capture never resumes
automatically after a reference ends. Stop, switching and pagehide cancel audio;
stale playback events cannot change the new selection's status.

The shared viewer serves both locales. Classic DSP and the acoustic/display
measurement separation remain unchanged. These audio clips are not ground truth
for the independent acoustic validation protocol.

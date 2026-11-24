# American pronunciation audio

Every word card has a primary American pronunciation. Where no explicitly
American Wiktionary recording is indexed, this directory supplies an MP3 made
from the word text with **CMU Flite's `cmu_us_slt` US English voice** via FFmpeg.
These are synthetic reference pronunciations, not human recordings or Google
audio. They do not require an installed browser voice or a third-party TTS API.

The lexicon records each file's word, voice, locale and SHA-256 checksum. The
filename hashes the word and generation recipe; no voice model is distributed.
Uncommon words may use the synthesizer's letter-to-sound rules. The original
IPA and dictionary links remain available independently of the audio.

Generate with `python tools/american_pronunciation.py`, then run
`python tools/sync_embedded.py`. FFmpeg must provide `flite` and `libmp3lame`.
Existing human recordings remain hosted on Wikimedia Commons, with their own
per-file attribution and license links in the word cards.

Sources: [CMU Flite](https://github.com/festvox/flite),
[FFmpeg's Flite integration](https://ffmpeg.org/ffmpeg-filters.html#flite).
The installed synthesizer's copyright and license notices are retained in
[FLITE-NOTICES.txt](FLITE-NOTICES.txt). CMU and its contributors do not endorse
this project.

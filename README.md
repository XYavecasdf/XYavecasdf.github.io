# xyavecasdf.github.io

Personal GitHub Pages site for notes, projects, and language-learning tools.

## Spanish Lyrics Study Notebook

The Spanish Lyrics Study Notebook is a local-first private study tool at `/projects/spanish-lyrics-study/`. It is designed for studying Spanish vocabulary, grammar, pronunciation, and usage from songs you already listen to, starting with the album metadata for *Esencial La Oreja de Van Gogh* by La Oreja de Van Gogh.

### Copyright and privacy warning

Do not commit lyrics, private analysis notes, or exported backups to this public repository. The public page contains only the interface and starter song metadata; actual lyric lines and notes are stored only in your browser's `localStorage` under namespaced keys such as `spanishLyricsStudy.songs` and `spanishLyricsStudy.lines`.

Exported files may contain copyrighted lyrics and personal notes. Keep these backups private. The repository `.gitignore` includes these backup patterns:

- `*_lyrics_backup.json`
- `private_lyrics_*.json`
- `anki_export_*.csv`
- `spanish_lyrics_private_*.json`

### How to use

1. Open the Spanish Lyrics Study Notebook page.
2. Select one of the starter songs or add a custom song.
3. Paste lyrics manually into the paste box, one line per row. Empty rows are ignored, and adjacent duplicate lines trigger a warning without blocking the save.
4. Fill in the study fields under each line: Chinese meaning, English meaning, literal translation, word breakdown, vocabulary, expressions, grammar, tense/mood/aspect, clitics, pronunciation notes, speech register, example sentence, tags, difficulty, and review status.
5. Use search and filters to review lines by song, level, status, tense/mood, tag, or speech register.
6. Use the reset button only when you intentionally want to clear local browser data.

### Import and export

- **Export private JSON backup** downloads all local songs and lyric-line notes. This may include copyrighted lyrics, so keep it private.
- **Import private JSON backup** restores a previously exported JSON file into browser `localStorage`.
- **Export selected lines as Anki CSV** downloads the currently filtered line set as a CSV that can be imported into Anki or another flashcard tool. This export may include lyric text and notes, so keep it private.

### Compact study interface

Each lyric line opens in a compact read view that shows the Spanish line, Chinese meaning, English meaning, small metadata, and lightweight action buttons. Optional details are hidden until expanded, and the read view uses only three accordion sections: `解析`, `发音`, and `例句`. Editing keeps the existing localStorage data shape and groups fields into Basic, `解析`, `发音`, and `例句`; no migration is required for existing browser data.

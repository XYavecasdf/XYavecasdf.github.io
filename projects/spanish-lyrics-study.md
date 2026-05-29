---
layout: page
title: Spanish Lyrics Study Notebook
permalink: /projects/spanish-lyrics-study/
---

<section class="lyrics-study-app" id="spanish-lyrics-study-app">
  <header class="lyrics-hero">
    <p class="lyrics-kicker">Project · Local-first language study</p>
    <h1>Spanish Lyrics Study Notebook</h1>
    <p class="lyrics-subtitle">A private local-first tool for studying Spanish vocabulary, grammar, and pronunciation through song lyrics from <em>Esencial La Oreja de Van Gogh</em>.</p>
    <p class="privacy-warning"><strong>Privacy warning:</strong> This tool stores lyrics and notes locally in your browser. Do not commit exported lyric backups to the public repository.</p>
  </header>

  <noscript>
    <p class="privacy-warning"><strong>JavaScript required:</strong> This notebook stores all study data in browser localStorage and needs JavaScript enabled.</p>
  </noscript>

  <section class="lyrics-toolbar" aria-label="Backup and data tools">
    <div>
      <h2>Private data tools</h2>
      <p class="export-warning">This export may contain copyrighted lyrics. Keep it private.</p>
    </div>
    <div class="lyrics-actions">
      <button type="button" id="export-json">Export private JSON backup</button>
      <label class="button-like" for="import-json">Import private JSON backup</label>
      <input type="file" id="import-json" accept="application/json,.json" hidden>
      <button type="button" id="export-anki">Export selected lines as Anki CSV</button>
      <button type="button" class="danger" id="reset-data">Reset local notebook</button>
    </div>
  </section>

  <section class="lyrics-grid">
    <aside class="song-panel" aria-label="Song list">
      <div class="panel-heading">
        <h2>Songs</h2>
        <span id="song-count" class="pill">0 songs</span>
      </div>
      <label for="song-search">Search songs by title or artist</label>
      <input id="song-search" type="search" placeholder="Search songs...">
      <div id="song-list" class="song-list"></div>

      <details class="add-song-box">
        <summary>Add a custom song</summary>
        <form id="song-form" class="stacked-form">
          <label>Title <input name="title" required></label>
          <label>Artist <input name="artist" value="La Oreja de Van Gogh" required></label>
          <label>Album <input name="album" value="Esencial La Oreja de Van Gogh"></label>
          <label>Apple Music link <input name="appleMusicLink" type="url" placeholder="https://music.apple.com/..."></label>
          <label>Original album <input name="originalAlbum"></label>
          <label>Release year <input name="releaseYear" inputmode="numeric" pattern="[0-9]{4}"></label>
          <label>Notes <textarea name="notes" rows="3"></textarea></label>
          <button type="submit">Add song</button>
        </form>
      </details>
    </aside>

    <main class="study-panel" aria-live="polite">
      <section id="song-detail" class="song-detail"></section>

      <section class="filters-panel" aria-label="Search and filters">
        <h2>Search and filter lines</h2>
        <div class="filter-grid">
          <label>Text search <input id="line-search" type="search" placeholder="lyrics, vocabulary, grammar, tags, examples..."></label>
          <label>Song <select id="filter-song"><option value="all">All songs</option></select></label>
          <label>Difficulty <select id="filter-difficulty"><option value="all">All levels</option></select></label>
          <label>Review status <select id="filter-review"><option value="all">All statuses</option></select></label>
          <label>Tense / mood <input id="filter-tense" placeholder="pretérito, subjuntivo..."></label>
          <label>Tag <input id="filter-tag" placeholder="ser/estar, clitic..."></label>
          <label>Speech register <select id="filter-register"><option value="all">All registers</option></select></label>
        </div>
      </section>

      <section id="line-list" class="line-list" aria-label="Lyric line study cards"></section>
    </main>
  </section>
</section>

<script src="{{ '/assets/js/spanish-lyrics-study.js' | relative_url }}" defer></script>

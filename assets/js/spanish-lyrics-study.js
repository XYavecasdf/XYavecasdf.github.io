(() => {
  'use strict';

  /**
   * Song shape: id, title, artist, album, appleMusicLink, originalAlbum,
   * releaseYear, notes, sourceStatus.
   * LyricLine shape: id, songId, lineOrder, lyricText, zhMeaning, enMeaning,
   * literalTranslation, wordBreakdown, vocabularyNotes, commonExpressions,
   * grammarExplanation, tenseMoodAspect, pronouns, ipa, syllables, stressNote,
   * spainPronunciationNote, latinAmericaPronunciationNote, speechRegister,
   * myExampleSentence, tags, difficulty, reviewStatus.
   */
  const STORAGE_KEYS = {
    songs: 'spanishLyricsStudy.songs',
    lines: 'spanishLyricsStudy.lines',
    selectedSong: 'spanishLyricsStudy.selectedSong'
  };

  const SOURCE_STATUS = ['not_added', 'lyrics_pasted', 'partially_analyzed', 'completed'];
  const DIFFICULTIES = ['A1', 'A2', 'B1', 'B2', 'C1'];
  const REVIEW_STATUSES = ['new', 'learning', 'mastered'];
  const SPEECH_REGISTERS = ['common', 'poetic', 'formal', 'colloquial', 'unclear'];
  const ALBUM = 'Esencial La Oreja de Van Gogh';
  const ARTIST = 'La Oreja de Van Gogh';

  const STARTER_SONGS = [
    'Puedes Contar Conmigo',
    'La Playa',
    'Jueves',
    'Abrázame',
    'La Chica del Espejo',
    'Rosas',
    '20 de Enero',
    'Muñeca de Trapo',
    'Dulce Locura',
    'El Último Vals'
  ].map((title) => ({
    id: slugify(`starter-${title}`),
    title,
    artist: ARTIST,
    album: ALBUM,
    appleMusicLink: '',
    originalAlbum: '',
    releaseYear: '',
    notes: 'Starter song record only. Paste lyrics privately in this browser.',
    sourceStatus: 'not_added'
  }));

  const state = {
    songs: [],
    lines: [],
    selectedSongId: '',
    songSearch: '',
    filters: {
      query: '',
      songId: 'all',
      difficulty: 'all',
      reviewStatus: 'all',
      tenseMood: '',
      tag: '',
      speechRegister: 'all'
    }
  };

  const els = {};

  document.addEventListener('DOMContentLoaded', init);

  function init() {
    cacheElements();
    state.songs = loadArray(STORAGE_KEYS.songs, STARTER_SONGS);
    state.lines = loadArray(STORAGE_KEYS.lines, []);
    state.selectedSongId = localStorage.getItem(STORAGE_KEYS.selectedSong) || state.songs[0]?.id || '';
    ensureStarterSongs();
    bindEvents();
    populateStaticSelects();
    render();
  }

  function cacheElements() {
    els.songCount = document.querySelector('#song-count');
    els.songSearch = document.querySelector('#song-search');
    els.songList = document.querySelector('#song-list');
    els.songForm = document.querySelector('#song-form');
    els.songDetail = document.querySelector('#song-detail');
    els.lineList = document.querySelector('#line-list');
    els.exportJson = document.querySelector('#export-json');
    els.importJson = document.querySelector('#import-json');
    els.exportAnki = document.querySelector('#export-anki');
    els.resetData = document.querySelector('#reset-data');
    els.filters = {
      query: document.querySelector('#line-search'),
      songId: document.querySelector('#filter-song'),
      difficulty: document.querySelector('#filter-difficulty'),
      reviewStatus: document.querySelector('#filter-review'),
      tenseMood: document.querySelector('#filter-tense'),
      tag: document.querySelector('#filter-tag'),
      speechRegister: document.querySelector('#filter-register')
    };
  }

  function bindEvents() {
    els.songSearch.addEventListener('input', (event) => {
      state.songSearch = event.target.value.trim().toLowerCase();
      renderSongList();
    });

    els.songForm.addEventListener('submit', (event) => {
      event.preventDefault();
      const data = new FormData(event.currentTarget);
      const title = clean(data.get('title'));
      const artist = clean(data.get('artist'));
      if (!title || !artist) return;
      const song = {
        id: uniqueId('song'),
        title,
        artist,
        album: clean(data.get('album')),
        appleMusicLink: clean(data.get('appleMusicLink')),
        originalAlbum: clean(data.get('originalAlbum')),
        releaseYear: clean(data.get('releaseYear')),
        notes: clean(data.get('notes')),
        sourceStatus: 'not_added'
      };
      state.songs.push(song);
      state.selectedSongId = song.id;
      saveSongs();
      event.currentTarget.reset();
      render();
    });

    els.exportJson.addEventListener('click', exportJson);
    els.importJson.addEventListener('change', importJson);
    els.exportAnki.addEventListener('click', exportAnkiCsv);
    els.resetData.addEventListener('click', resetData);

    Object.entries(els.filters).forEach(([key, element]) => {
      element.addEventListener('input', () => {
        state.filters[key] = element.value.trim ? element.value.trim() : element.value;
        renderLines();
      });
      element.addEventListener('change', () => {
        state.filters[key] = element.value;
        renderLines();
      });
    });
  }

  function populateStaticSelects() {
    addOptions(els.filters.difficulty, DIFFICULTIES);
    addOptions(els.filters.reviewStatus, REVIEW_STATUSES);
    addOptions(els.filters.speechRegister, SPEECH_REGISTERS);
  }

  function addOptions(select, values) {
    values.forEach((value) => {
      const option = document.createElement('option');
      option.value = value;
      option.textContent = value;
      select.append(option);
    });
  }

  function render() {
    if (!state.songs.some((song) => song.id === state.selectedSongId)) {
      state.selectedSongId = state.songs[0]?.id || '';
    }
    localStorage.setItem(STORAGE_KEYS.selectedSong, state.selectedSongId);
    syncFilterSongOptions();
    renderSongList();
    renderSongDetail();
    renderLines();
  }

  function renderSongList() {
    els.songCount.textContent = `${state.songs.length} songs`;
    els.songList.innerHTML = '';
    const songs = state.songs.filter((song) => `${song.title} ${song.artist}`.toLowerCase().includes(state.songSearch));
    songs.forEach((song) => {
      const progress = getSongProgress(song.id);
      const button = document.createElement('button');
      button.type = 'button';
      button.className = `song-card${song.id === state.selectedSongId ? ' active' : ''}`;
      button.innerHTML = `
        <strong>${escapeHtml(song.title)}</strong>
        <span>${escapeHtml(song.artist)}</span>
        <small>${progress.total} lines · ${progress.analyzed} analyzed · ${progress.mastered} mastered</small>
      `;
      button.addEventListener('click', () => {
        state.selectedSongId = song.id;
        state.filters.songId = song.id;
        els.filters.songId.value = song.id;
        render();
      });
      els.songList.append(button);
    });
    if (!songs.length) {
      els.songList.innerHTML = '<p class="empty-state">No songs match that search.</p>';
    }
  }

  function renderSongDetail() {
    const song = selectedSong();
    if (!song) {
      els.songDetail.innerHTML = '<p class="empty-state">Add a song to begin.</p>';
      return;
    }
    const progress = getSongProgress(song.id);
    els.songDetail.innerHTML = `
      <div class="panel-heading">
        <div>
          <p class="lyrics-kicker">Selected song</p>
          <h2>${escapeHtml(song.title)}</h2>
          <p>${escapeHtml(song.artist)} · ${escapeHtml(song.album || 'No album set')}</p>
        </div>
        <span class="pill">${progress.total} lines</span>
      </div>
      <div class="metadata-grid">
        ${metadataItem('Original album', song.originalAlbum)}
        ${metadataItem('Release year', song.releaseYear)}
        ${metadataItem('Source status', song.sourceStatus)}
        ${song.appleMusicLink ? `<a href="${escapeAttribute(song.appleMusicLink)}" rel="noopener noreferrer" target="_blank">Apple Music</a>` : '<span>No Apple Music link</span>'}
      </div>
      <label for="song-notes">Song notes</label>
      <textarea id="song-notes" rows="3">${escapeHtml(song.notes || '')}</textarea>
      <label for="source-status">Source status</label>
      <select id="source-status">${SOURCE_STATUS.map((status) => `<option value="${status}" ${song.sourceStatus === status ? 'selected' : ''}>${status}</option>`).join('')}</select>
      <form id="paste-lines-form" class="paste-box">
        <label for="paste-lines">Paste lyric lines privately (one line per row)</label>
        <textarea id="paste-lines" rows="5" placeholder="[paste lyric line here]"></textarea>
        <p id="paste-warning" class="inline-warning" hidden></p>
        <button type="submit">Save non-empty lines</button>
      </form>
    `;

    els.songDetail.querySelector('#song-notes').addEventListener('input', (event) => {
      song.notes = event.target.value;
      saveSongs();
    });
    els.songDetail.querySelector('#source-status').addEventListener('change', (event) => {
      song.sourceStatus = event.target.value;
      saveSongs();
      renderSongList();
    });
    els.songDetail.querySelector('#paste-lines-form').addEventListener('submit', pasteLines);
  }

  function metadataItem(label, value) {
    return `<span><strong>${label}:</strong> ${escapeHtml(value || '—')}</span>`;
  }

  function renderLines() {
    els.lineList.innerHTML = '';
    const lines = filteredLines();
    if (!lines.length) {
      els.lineList.innerHTML = '<p class="empty-state">No lyric lines match the current selection.</p>';
      return;
    }
    lines.forEach((line) => els.lineList.append(lineCard(line)));
  }

  function lineCard(line) {
    const song = state.songs.find((item) => item.id === line.songId);
    const article = document.createElement('article');
    article.className = 'line-card';
    article.dataset.lineId = line.id;
    article.innerHTML = `
      <div class="line-card-header">
        <div>
          <span class="pill">#${line.lineOrder}</span>
          <strong>${escapeHtml(song?.title || 'Unknown song')}</strong>
        </div>
        <div class="line-actions">
          <button type="button" data-action="up">↑</button>
          <button type="button" data-action="down">↓</button>
          <button type="button" data-action="copy">Copy AI Analysis Prompt</button>
          <button type="button" class="danger" data-action="delete">Delete</button>
        </div>
      </div>
      <div class="study-flow">
        ${textareaField('Spanish line', 'lyricText', line.lyricText, 2)}
        ${textareaField('Chinese meaning', 'zhMeaning', line.zhMeaning)}
        ${textareaField('English meaning', 'enMeaning', line.enMeaning)}
        ${textareaField('Literal translation', 'literalTranslation', line.literalTranslation)}
        ${textareaField('Word breakdown', 'wordBreakdown', line.wordBreakdown)}
        ${textareaField('Vocabulary', 'vocabularyNotes', line.vocabularyNotes)}
        ${textareaField('Common expressions', 'commonExpressions', line.commonExpressions)}
        ${textareaField('Grammar', 'grammarExplanation', line.grammarExplanation)}
        ${textareaField('Tense / mood / aspect', 'tenseMoodAspect', line.tenseMoodAspect)}
        ${textareaField('Pronouns and clitics', 'pronouns', line.pronouns)}
        <fieldset>
          <legend>Pronunciation</legend>
          ${inputField('IPA', 'ipa', line.ipa)}
          ${inputField('Syllable breakdown', 'syllables', line.syllables)}
          ${inputField('Stress position', 'stressNote', line.stressNote)}
          ${textareaField('Spain pronunciation notes', 'spainPronunciationNote', line.spainPronunciationNote)}
          ${textareaField('Latin America pronunciation notes', 'latinAmericaPronunciationNote', line.latinAmericaPronunciationNote)}
        </fieldset>
        <label>Common spoken Spanish or poetic/lyrical?
          <select data-field="speechRegister">${optionList(SPEECH_REGISTERS, line.speechRegister || 'unclear')}</select>
        </label>
        ${textareaField('My own sentence', 'myExampleSentence', line.myExampleSentence)}
        ${inputField('Tags (comma separated)', 'tags', line.tags)}
        <div class="inline-controls">
          <label>Difficulty <select data-field="difficulty">${optionList(DIFFICULTIES, line.difficulty || 'A2')}</select></label>
          <label>Review status <select data-field="reviewStatus">${optionList(REVIEW_STATUSES, line.reviewStatus || 'new')}</select></label>
        </div>
      </div>
    `;

    article.addEventListener('input', updateLineFromEvent);
    article.addEventListener('change', updateLineFromEvent);
    article.addEventListener('click', handleLineAction);
    return article;
  }

  function textareaField(label, field, value = '', rows = 3) {
    return `<label>${label}<textarea rows="${rows}" data-field="${field}">${escapeHtml(value || '')}</textarea></label>`;
  }

  function inputField(label, field, value = '') {
    return `<label>${label}<input data-field="${field}" value="${escapeAttribute(value || '')}"></label>`;
  }

  function optionList(values, selected) {
    return values.map((value) => `<option value="${value}" ${value === selected ? 'selected' : ''}>${value}</option>`).join('');
  }

  function pasteLines(event) {
    event.preventDefault();
    const song = selectedSong();
    if (!song) return;
    const textarea = event.currentTarget.querySelector('#paste-lines');
    const warning = event.currentTarget.querySelector('#paste-warning');
    const rawLines = textarea.value.split(/\r?\n/).map((line) => line.trim());
    const nonEmpty = rawLines.filter(Boolean);
    if (!nonEmpty.length) {
      warning.textContent = 'No non-empty lyric lines found.';
      warning.hidden = false;
      return;
    }
    const hasAdjacentDuplicate = nonEmpty.some((line, index) => index > 0 && line === nonEmpty[index - 1]);
    const nextOrder = nextLineOrder(song.id);
    nonEmpty.forEach((lyricText, index) => {
      state.lines.push(createLine(song.id, nextOrder + index, lyricText));
    });
    song.sourceStatus = song.sourceStatus === 'not_added' ? 'lyrics_pasted' : song.sourceStatus;
    saveLines();
    saveSongs();
    textarea.value = '';
    warning.textContent = hasAdjacentDuplicate ? 'Adjacent duplicate lines were detected and saved. Please review them.' : '';
    warning.hidden = !hasAdjacentDuplicate;
    render();
  }

  function createLine(songId, lineOrder, lyricText = '') {
    return {
      id: uniqueId('line'), songId, lineOrder, lyricText,
      zhMeaning: '', enMeaning: '', literalTranslation: '', wordBreakdown: '', vocabularyNotes: '',
      commonExpressions: '', grammarExplanation: '', tenseMoodAspect: '', pronouns: '', ipa: '',
      syllables: '', stressNote: '', spainPronunciationNote: '', latinAmericaPronunciationNote: '',
      speechRegister: 'unclear', myExampleSentence: '', tags: '', difficulty: 'A2', reviewStatus: 'new'
    };
  }

  function updateLineFromEvent(event) {
    const field = event.target.dataset.field;
    if (!field) return;
    const card = event.target.closest('.line-card');
    const line = state.lines.find((item) => item.id === card.dataset.lineId);
    if (!line) return;
    line[field] = event.target.value;
    saveLines();
    renderSongList();
  }

  function handleLineAction(event) {
    const button = event.target.closest('button[data-action]');
    if (!button) return;
    const lineId = button.closest('.line-card').dataset.lineId;
    const action = button.dataset.action;
    if (action === 'delete') deleteLine(lineId);
    if (action === 'up' || action === 'down') moveLine(lineId, action);
    if (action === 'copy') copyPrompt(lineId, button);
  }

  function deleteLine(lineId) {
    if (!confirm('Delete this lyric line and all notes stored for it in this browser?')) return;
    const line = state.lines.find((item) => item.id === lineId);
    state.lines = state.lines.filter((item) => item.id !== lineId);
    normalizeOrders(line?.songId);
    saveLines();
    render();
  }

  function moveLine(lineId, direction) {
    const line = state.lines.find((item) => item.id === lineId);
    if (!line) return;
    const siblings = state.lines.filter((item) => item.songId === line.songId).sort(byOrder);
    const index = siblings.findIndex((item) => item.id === lineId);
    const swapWith = direction === 'up' ? index - 1 : index + 1;
    if (swapWith < 0 || swapWith >= siblings.length) return;
    const other = siblings[swapWith];
    [line.lineOrder, other.lineOrder] = [other.lineOrder, line.lineOrder];
    saveLines();
    render();
  }

  async function copyPrompt(lineId, button) {
    const line = state.lines.find((item) => item.id === lineId);
    if (!line) return;
    const prompt = `请按以下格式分析这句西语歌词。不要续写歌词，不要补全整首歌，只分析我给出的这一句。\n\n句子：\n${line.lyricText || '[paste lyric line here]'}\n\n我的水平：A2，目标是到 B1。\n\n请输出：\n1. 自然中文意思\n2. 自然英文意思\n3. 直译\n4. 逐词拆解\n5. 生词\n6. 常见表达\n7. 语法点\n8. 时态/语气/体\n9. 代词和宾语位置\n10. IPA\n11. 分音节\n12. 重音位置\n13. 西班牙发音提醒\n14. 拉美发音提醒\n15. 这句话是日常口语还是偏歌词/文学\n16. 三个 A2-B1 自己造句`;
    try {
      await navigator.clipboard.writeText(prompt);
      flashButton(button, 'Copied!');
    } catch {
      window.prompt('Copy this prompt:', prompt);
    }
  }

  function filteredLines() {
    const query = state.filters.query.toLowerCase();
    return state.lines
      .filter((line) => state.filters.songId === 'all' || line.songId === state.filters.songId)
      .filter((line) => state.filters.difficulty === 'all' || line.difficulty === state.filters.difficulty)
      .filter((line) => state.filters.reviewStatus === 'all' || line.reviewStatus === state.filters.reviewStatus)
      .filter((line) => state.filters.speechRegister === 'all' || line.speechRegister === state.filters.speechRegister)
      .filter((line) => !state.filters.tenseMood || (line.tenseMoodAspect || '').toLowerCase().includes(state.filters.tenseMood.toLowerCase()))
      .filter((line) => !state.filters.tag || (line.tags || '').toLowerCase().includes(state.filters.tag.toLowerCase()))
      .filter((line) => !query || [line.lyricText, line.vocabularyNotes, line.grammarExplanation, line.tags, line.myExampleSentence].join(' ').toLowerCase().includes(query))
      .sort((a, b) => a.songId.localeCompare(b.songId) || a.lineOrder - b.lineOrder);
  }

  function syncFilterSongOptions() {
    const current = els.filters.songId.value || 'all';
    els.filters.songId.innerHTML = '<option value="all">All songs</option>';
    state.songs.forEach((song) => {
      const option = document.createElement('option');
      option.value = song.id;
      option.textContent = `${song.title} — ${song.artist}`;
      els.filters.songId.append(option);
    });
    els.filters.songId.value = state.songs.some((song) => song.id === current) ? current : 'all';
    state.filters.songId = els.filters.songId.value;
  }

  function exportJson() {
    downloadJson(`spanish_lyrics_private_${dateStamp()}.json`, {
      exportedAt: new Date().toISOString(),
      warning: 'This backup may contain copyrighted lyrics. Keep it private.',
      songs: state.songs,
      lines: state.lines
    });
  }

  function importJson(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result);
        if (!Array.isArray(data.songs) || !Array.isArray(data.lines)) throw new Error('Invalid backup shape.');
        if (!confirm('Import this backup and replace local Spanish lyrics study data in this browser?')) return;
        state.songs = data.songs;
        state.lines = data.lines;
        ensureStarterSongs();
        saveSongs();
        saveLines();
        render();
      } catch (error) {
        alert(`Could not import backup: ${error.message}`);
      } finally {
        event.target.value = '';
      }
    };
    reader.readAsText(file);
  }

  function exportAnkiCsv() {
    const rows = filteredLines().map((line) => {
      const song = state.songs.find((item) => item.id === line.songId);
      return [
        line.lyricText, line.zhMeaning, line.enMeaning, line.literalTranslation, line.wordBreakdown,
        line.vocabularyNotes, line.commonExpressions, line.grammarExplanation, line.ipa,
        line.myExampleSentence, line.reviewStatus, line.tags, song?.title || ''
      ];
    });
    const header = ['Spanish line', 'Chinese meaning', 'English meaning', 'Literal translation', 'Word breakdown', 'Vocabulary', 'Expressions', 'Grammar', 'IPA', 'Example', 'Review status', 'Tags', 'Song'];
    const csv = [header, ...rows].map((row) => row.map(csvCell).join(',')).join('\n');
    downloadBlob(`anki_export_${dateStamp()}.csv`, csv, 'text/csv;charset=utf-8');
  }

  function resetData() {
    if (!confirm('Reset all Spanish lyrics study data stored in this browser? Export a private backup first if needed.')) return;
    localStorage.removeItem(STORAGE_KEYS.songs);
    localStorage.removeItem(STORAGE_KEYS.lines);
    localStorage.removeItem(STORAGE_KEYS.selectedSong);
    state.songs = STARTER_SONGS.map((song) => ({ ...song }));
    state.lines = [];
    state.selectedSongId = state.songs[0]?.id || '';
    saveSongs();
    saveLines();
    render();
  }

  function ensureStarterSongs() {
    const existingIds = new Set(state.songs.map((song) => song.id));
    STARTER_SONGS.forEach((song) => {
      if (!existingIds.has(song.id)) state.songs.push({ ...song });
    });
    saveSongs();
  }

  function getSongProgress(songId) {
    const songLines = state.lines.filter((line) => line.songId === songId);
    return {
      total: songLines.length,
      analyzed: songLines.filter((line) => [line.zhMeaning, line.enMeaning, line.vocabularyNotes, line.grammarExplanation, line.ipa].some(Boolean)).length,
      mastered: songLines.filter((line) => line.reviewStatus === 'mastered').length
    };
  }

  function selectedSong() { return state.songs.find((song) => song.id === state.selectedSongId); }
  function nextLineOrder(songId) { return Math.max(0, ...state.lines.filter((line) => line.songId === songId).map((line) => Number(line.lineOrder) || 0)) + 1; }
  function normalizeOrders(songId) { if (!songId) return; state.lines.filter((line) => line.songId === songId).sort(byOrder).forEach((line, index) => { line.lineOrder = index + 1; }); }
  function byOrder(a, b) { return a.lineOrder - b.lineOrder; }
  function saveSongs() { localStorage.setItem(STORAGE_KEYS.songs, JSON.stringify(state.songs)); }
  function saveLines() { localStorage.setItem(STORAGE_KEYS.lines, JSON.stringify(state.lines)); }
  function loadArray(key, fallback) { try { const parsed = JSON.parse(localStorage.getItem(key)); return Array.isArray(parsed) ? parsed : fallback.map((item) => ({ ...item })); } catch { return fallback.map((item) => ({ ...item })); } }
  function uniqueId(prefix) { return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`; }
  function slugify(value) { return value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''); }
  function clean(value) { return String(value || '').trim(); }
  function dateStamp() { return new Date().toISOString().slice(0, 10); }
  function csvCell(value) { return `"${String(value || '').replace(/"/g, '""')}"`; }
  function escapeHtml(value) { return String(value || '').replace(/[&<>"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[char])); }
  function escapeAttribute(value) { return escapeHtml(value).replace(/'/g, '&#39;'); }
  function downloadJson(filename, data) { downloadBlob(filename, JSON.stringify(data, null, 2), 'application/json'); }
  function downloadBlob(filename, content, type) { const blob = new Blob([content], { type }); const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = filename; link.click(); URL.revokeObjectURL(url); }
  function flashButton(button, text) { const old = button.textContent; button.textContent = text; setTimeout(() => { button.textContent = old; }, 1400); }
})();

(() => {
  'use strict';

  /**
   * Song shape: id, title, artist, album, appleMusicLink, originalAlbum,
   * releaseYear, notes, sourceStatus.
   * LyricLine shape: id, songId, lineOrder, lyricText, zhMeaning, enMeaning,
   * literalTranslation, wordBreakdown, vocabularyNotes, commonExpressions,
   * grammarExplanation, tenseMoodAspect, pronouns, ipa, syllables, stressNote,
   * spainPronunciationNote, latinAmericaPronunciationNote, speechRegister,
   * myExampleSentence, tags, difficulty, reviewStatus. New optional fields are
   * additive only (for example aiAnalysisStatus) to keep saved localStorage data compatible.
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

  const FIELD_GROUPS = {
    basic: [
      ['Spanish line', 'lyricText', 'textarea'],
      ['Chinese meaning', 'zhMeaning', 'textarea'],
      ['English meaning', 'enMeaning', 'textarea'],
      ['Literal translation', 'literalTranslation', 'textarea'],
      ['Difficulty', 'difficulty', 'difficulty'],
      ['Review status', 'reviewStatus', 'review'],
      ['Tags', 'tags', 'input']
    ],
    analysis: [
      ['Word breakdown', 'wordBreakdown', 'textarea'],
      ['Vocabulary notes', 'vocabularyNotes', 'textarea'],
      ['Common expressions', 'commonExpressions', 'textarea'],
      ['Grammar explanation', 'grammarExplanation', 'textarea'],
      ['Tense / mood / aspect', 'tenseMoodAspect', 'textarea'],
      ['Pronouns and clitics', 'pronouns', 'textarea'],
      ['Speech register', 'speechRegister', 'register']
    ],
    pronunciation: [
      ['IPA', 'ipa', 'input'],
      ['Syllable breakdown', 'syllables', 'input'],
      ['Stress note', 'stressNote', 'input'],
      ['Spain pronunciation note', 'spainPronunciationNote', 'textarea'],
      ['Latin America pronunciation note', 'latinAmericaPronunciationNote', 'textarea']
    ],
    examples: [
      ['My own example sentence', 'myExampleSentence', 'textarea'],
      ['Additional example sentences', 'additionalExamples', 'textarea']
    ]
  };

  const NUMBERED_PROMPT_MAP = {
    1: 'zhMeaning',
    2: 'enMeaning',
    3: 'literalTranslation',
    4: 'wordBreakdown',
    5: 'vocabularyNotes',
    6: 'commonExpressions',
    7: 'grammarExplanation',
    8: 'tenseMoodAspect',
    9: 'pronouns',
    10: 'ipa',
    11: 'syllables',
    12: 'stressNote',
    13: 'spainPronunciationNote',
    14: 'latinAmericaPronunciationNote',
    15: 'speechRegister',
    16: 'myExampleSentence'
  };

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
    state.filters.songId = state.selectedSongId || 'all';
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
      state.filters.songId = song.id;
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
    if (!songs.length) els.songList.innerHTML = '<p class="empty-state">No songs match that search.</p>';
  }

  function renderSongDetail() {
    const song = selectedSong();
    if (!song) {
      els.songDetail.innerHTML = '<p class="empty-state">Add a song to begin.</p>';
      return;
    }
    const progress = getSongProgress(song.id);
    els.songDetail.innerHTML = `
      <div class="song-summary">
        <div>
          <p class="lyrics-kicker">Selected song</p>
          <h2>${escapeHtml(song.title)}</h2>
          <p>${escapeHtml(song.artist)} · ${escapeHtml(song.album || 'No album set')}</p>
        </div>
        <div class="progress-row" aria-label="Progress summary">
          <span class="pill">${progress.total} lines</span>
          <span class="pill">${progress.analyzed} analyzed</span>
          <span class="pill">${progress.mastered} mastered</span>
        </div>
      </div>
      <div class="song-quick-actions">
        <button type="button" id="toggle-paste">Paste lyrics</button>
        <label class="song-search-label" for="song-line-search">Search within this song
          <input id="song-line-search" type="search" value="${escapeAttribute(state.filters.query)}" placeholder="meaning, grammar, tags, examples...">
        </label>
      </div>
      <div class="metadata-grid compact-metadata">
        ${metadataItem('Original album', song.originalAlbum)}
        ${metadataItem('Release year', song.releaseYear)}
        ${metadataItem('Source status', song.sourceStatus)}
        ${song.appleMusicLink ? `<a href="${escapeAttribute(song.appleMusicLink)}" rel="noopener noreferrer" target="_blank">Apple Music</a>` : '<span>No Apple Music link</span>'}
      </div>
      <details class="song-settings">
        <summary>Song notes and source status</summary>
        <label for="song-notes">Song notes</label>
        <textarea id="song-notes" rows="3">${escapeHtml(song.notes || '')}</textarea>
        <label for="source-status">Source status</label>
        <select id="source-status">${SOURCE_STATUS.map((status) => `<option value="${status}" ${song.sourceStatus === status ? 'selected' : ''}>${status}</option>`).join('')}</select>
      </details>
      <form id="paste-lines-form" class="paste-box" hidden>
        <label for="paste-lines">Paste lyric lines privately (one line per row)</label>
        <textarea id="paste-lines" rows="5" placeholder="[paste lyric line here]"></textarea>
        <p id="paste-warning" class="inline-warning" hidden></p>
        <button type="submit">Save non-empty lines</button>
      </form>
    `;

    els.songDetail.querySelector('#toggle-paste').addEventListener('click', () => {
      const form = els.songDetail.querySelector('#paste-lines-form');
      form.hidden = !form.hidden;
      if (!form.hidden) form.querySelector('textarea').focus();
    });
    els.songDetail.querySelector('#song-line-search').addEventListener('input', (event) => {
      state.filters.query = event.target.value.trim();
      els.filters.query.value = state.filters.query;
      renderLines();
    });
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
    article.className = 'line-card compact-line-card';
    article.dataset.lineId = line.id;
    article.innerHTML = `
      <div class="line-compact-view">
        <div class="line-main-row">
          <span class="line-number">${line.lineOrder}</span>
          <div>
            <p class="spanish-line">${escapeHtml(line.lyricText || '[paste lyric line here]')}</p>
            ${line.zhMeaning ? `<p class="zh-meaning">${escapeHtml(line.zhMeaning)}</p>` : '<p class="empty-meaning">Add Chinese meaning in Edit.</p>'}
            ${line.enMeaning ? `<p class="en-meaning">${escapeHtml(line.enMeaning)}</p>` : ''}
          </div>
        </div>
        <div class="line-meta-row">
          <span>${escapeHtml(line.difficulty || 'A2')}</span>
          <span>${escapeHtml(line.reviewStatus || 'new')}</span>
          ${line.tags ? `<span>${escapeHtml(line.tags)}</span>` : ''}
          ${line.aiAnalysisStatus ? `<span>AI: ${escapeHtml(line.aiAnalysisStatus)}</span>` : ''}
          <span>${escapeHtml(song?.title || 'Unknown song')}</span>
        </div>
        <div class="line-actions small-actions">
          <button type="button" data-action="analyze">Analyze with AI</button>
          <button type="button" data-action="edit">Edit</button>
          <button type="button" data-action="copy">Copy Prompt</button>
          <button type="button" data-action="learning">Mark Learning</button>
          <button type="button" data-action="mastered">Mark Mastered</button>
          <button type="button" data-action="up" aria-label="Move line up">↑</button>
          <button type="button" data-action="down" aria-label="Move line down">↓</button>
          <button type="button" class="danger" data-action="delete">Delete</button>
        </div>
      </div>
      <div class="line-read-sections">
        ${readSection('解析', readItems(line, FIELD_GROUPS.analysis))}
        ${readSection('发音', readItems(line, FIELD_GROUPS.pronunciation))}
        ${readSection('例句', readItems(line, FIELD_GROUPS.examples))}
      </div>
      <section class="ai-workspace" hidden>
        <h3>AI analysis preview</h3>
        <p class="helper-text">Copy the prompt, paste the AI response here, then preview and apply it. Existing notes are only overwritten by “Apply all” after confirmation.</p>
        <textarea data-ai-response rows="8" placeholder="Paste the AI analysis response here..."></textarea>
        <div class="ai-preview empty-state">Paste an AI response to preview it in 解析 / 发音 / 例句.</div>
        <div class="small-actions">
          <button type="button" data-action="apply-ai-all">Apply all</button>
          <button type="button" data-action="merge-ai-empty">Merge only empty fields</button>
          <button type="button" data-action="cancel-ai">Cancel</button>
        </div>
      </section>
      <details class="line-edit-panel">
        <summary>Edit all fields</summary>
        ${editFieldset('Basic', FIELD_GROUPS.basic, line)}
        ${editFieldset('解析', FIELD_GROUPS.analysis, line)}
        ${editFieldset('发音', FIELD_GROUPS.pronunciation, line)}
        ${editFieldset('例句', FIELD_GROUPS.examples, line)}
      </details>
    `;

    article.addEventListener('input', updateLineFromEvent);
    article.addEventListener('change', updateLineFromEvent);
    article.addEventListener('click', handleLineAction);
    article.querySelector('[data-ai-response]').addEventListener('input', renderAiPreviewFromEvent);
    return article;
  }

  function readItems(line, fields) {
    return fields
      .map(([label, field]) => [label, line[field], field])
      .filter(([, value, field]) => clean(value) && !(field === 'speechRegister' && value === 'unclear'))
      .map(([label, value]) => [label, value]);
  }

  function readSection(title, items) {
    if (!items.length) return '';
    return `
      <details class="read-section">
        <summary>${title}</summary>
        <dl>${items.map(([label, value]) => `<div><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd></div>`).join('')}</dl>
      </details>
    `;
  }

  function editFieldset(title, fields, line) {
    return `
      <fieldset>
        <legend>${title}</legend>
        ${fields.map(([label, field, type]) => editField(label, field, type, line[field])).join('')}
      </fieldset>
    `;
  }

  function editField(label, field, type, value = '') {
    if (type === 'difficulty') return selectField(label, field, DIFFICULTIES, value || 'A2');
    if (type === 'review') return selectField(label, field, REVIEW_STATUSES, value || 'new');
    if (type === 'register') return selectField(label, field, SPEECH_REGISTERS, value || 'unclear');
    if (type === 'input') return `<label>${label}<input data-field="${field}" value="${escapeAttribute(value || '')}"></label>`;
    return `<label>${label}<textarea rows="3" data-field="${field}">${escapeHtml(value || '')}</textarea></label>`;
  }

  function selectField(label, field, values, selected) {
    return `<label>${label}<select data-field="${field}">${values.map((value) => `<option value="${value}" ${value === selected ? 'selected' : ''}>${value}</option>`).join('')}</select></label>`;
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
      speechRegister: 'unclear', myExampleSentence: '', additionalExamples: '', tags: '', difficulty: 'A2',
      reviewStatus: 'new', aiAnalysisStatus: ''
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
    const card = button.closest('.line-card');
    const lineId = card.dataset.lineId;
    const action = button.dataset.action;
    if (action === 'delete') deleteLine(lineId);
    if (action === 'up' || action === 'down') moveLine(lineId, action);
    if (action === 'copy') copyPrompt(lineId, button);
    if (action === 'edit') toggleEditPanel(card);
    if (action === 'analyze') openAiWorkspace(lineId, card);
    if (action === 'learning') setReviewStatus(lineId, 'learning');
    if (action === 'mastered') setReviewStatus(lineId, 'mastered');
    if (action === 'cancel-ai') card.querySelector('.ai-workspace').hidden = true;
    if (action === 'apply-ai-all') applyAiPreview(card, lineId, 'all');
    if (action === 'merge-ai-empty') applyAiPreview(card, lineId, 'empty');
  }

  function toggleEditPanel(card) {
    const details = card.querySelector('.line-edit-panel');
    details.open = !details.open;
    if (details.open) details.querySelector('[data-field]')?.focus();
  }

  function openAiWorkspace(lineId, card) {
    const line = state.lines.find((item) => item.id === lineId);
    if (!line) return;
    line.aiAnalysisStatus = line.aiAnalysisStatus || 'prompt_ready';
    saveLines();
    const workspace = card.querySelector('.ai-workspace');
    workspace.hidden = false;
    workspace.querySelector('[data-ai-response]').focus();
    renderSongList();
  }

  function setReviewStatus(lineId, status) {
    const line = state.lines.find((item) => item.id === lineId);
    if (!line) return;
    line.reviewStatus = status;
    saveLines();
    render();
  }

  function renderAiPreviewFromEvent(event) {
    const card = event.target.closest('.line-card');
    const parsed = parseAiResponse(event.target.value);
    card.dataset.aiPreview = JSON.stringify(parsed);
    card.querySelector('.ai-preview').innerHTML = aiPreviewHtml(parsed);
  }

  function aiPreviewHtml(parsed) {
    const analysis = readItems(parsed, FIELD_GROUPS.analysis);
    const pronunciation = readItems(parsed, FIELD_GROUPS.pronunciation);
    const examples = readItems(parsed, FIELD_GROUPS.examples);
    const basics = readItems(parsed, FIELD_GROUPS.basic.filter(([, field]) => ['zhMeaning', 'enMeaning', 'literalTranslation'].includes(field)));
    if (![...basics, ...analysis, ...pronunciation, ...examples].length) return 'Paste an AI response to preview it in 解析 / 发音 / 例句.';
    return `
      ${basics.length ? `<div class="preview-basics">${basics.map(([label, value]) => `<p><strong>${escapeHtml(label)}:</strong> ${escapeHtml(value)}</p>`).join('')}</div>` : ''}
      ${readSection('解析', analysis)}
      ${readSection('发音', pronunciation)}
      ${readSection('例句', examples)}
    `;
  }

  function applyAiPreview(card, lineId, mode) {
    const parsed = JSON.parse(card.dataset.aiPreview || '{}');
    if (!Object.keys(parsed).length) {
      alert('Paste an AI response before applying.');
      return;
    }
    const line = state.lines.find((item) => item.id === lineId);
    if (!line) return;
    if (mode === 'all' && hasAnyExistingNotes(line) && !confirm('Apply all AI fields and overwrite existing notes where the AI provided content?')) return;
    Object.entries(parsed).forEach(([field, value]) => {
      if (!clean(value)) return;
      if (field === 'speechRegister') value = normalizeSpeechRegister(value);
      if (mode === 'all' || !clean(line[field])) line[field] = value;
    });
    line.aiAnalysisStatus = mode === 'all' ? 'applied' : 'merged_empty';
    saveLines();
    render();
  }

  function hasAnyExistingNotes(line) {
    return Object.values(FIELD_GROUPS).flat().some(([, field]) => !['lyricText', 'difficulty', 'reviewStatus'].includes(field) && clean(line[field]));
  }

  function parseAiResponse(text) {
    const parsed = {};
    const matches = [...String(text || '').matchAll(/(?:^|\n)\s*(\d{1,2})[.、)]\s*([\s\S]*?)(?=\n\s*\d{1,2}[.、)]\s|$)/g)];
    matches.forEach((match) => {
      const field = NUMBERED_PROMPT_MAP[Number(match[1])];
      if (!field) return;
      parsed[field] = field === 'speechRegister' ? normalizeSpeechRegister(match[2]) : clean(match[2]);
    });
    return parsed;
  }

  function normalizeSpeechRegister(value) {
    const text = clean(value).toLowerCase();
    if (!text) return 'unclear';
    if (text.includes('口语') || text.includes('common')) return 'common';
    if (text.includes('歌词') || text.includes('文学') || text.includes('poetic') || text.includes('lyrical')) return 'poetic';
    if (text.includes('formal')) return 'formal';
    if (text.includes('colloquial')) return 'colloquial';
    return SPEECH_REGISTERS.includes(text) ? text : 'unclear';
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
      .filter((line) => !query || [line.lyricText, line.zhMeaning, line.enMeaning, line.vocabularyNotes, line.grammarExplanation, line.tags, line.myExampleSentence, line.additionalExamples].join(' ').toLowerCase().includes(query))
      .sort((a, b) => a.songId.localeCompare(b.songId) || a.lineOrder - b.lineOrder);
  }

  function syncFilterSongOptions() {
    const current = state.filters.songId || els.filters.songId.value || 'all';
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
    state.filters.songId = state.selectedSongId;
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

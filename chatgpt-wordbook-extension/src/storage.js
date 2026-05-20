const STORAGE_KEYS = { ENTRIES: "entries", IGNORED: "ignoredCandidates", SETTINGS: "settings" };
const DEFAULT_SETTINGS = { defaultTTSLanguage: "fr-FR", speechRate: 1, speechPitch: 1, uiLanguage: "en", minSuggestionScore: 3, suggestionEnabled: true };

function getLocal(keys) { return chrome.storage.local.get(keys); }
function setLocal(obj) { return chrome.storage.local.set(obj); }

async function getSettings() {
  const data = await getLocal(STORAGE_KEYS.SETTINGS);
  return { ...DEFAULT_SETTINGS, ...(data[STORAGE_KEYS.SETTINGS] || {}) };
}
async function saveSettings(settings) { await setLocal({ [STORAGE_KEYS.SETTINGS]: settings }); }
async function getEntries() { const d = await getLocal(STORAGE_KEYS.ENTRIES); return d[STORAGE_KEYS.ENTRIES] || []; }
async function saveEntries(entries) { await setLocal({ [STORAGE_KEYS.ENTRIES]: entries }); }
async function addEntry(entry) {
  const entries = await getEntries();
  if (!entries.find((e) => e.normalizedText === entry.normalizedText && e.language === entry.language)) {
    entries.unshift(entry); await saveEntries(entries);
  }
}
async function getIgnoredCandidates() { const d = await getLocal(STORAGE_KEYS.IGNORED); return d[STORAGE_KEYS.IGNORED] || []; }
async function saveIgnoredCandidates(list) { await setLocal({ [STORAGE_KEYS.IGNORED]: list }); }

window.WordbookStorage = { STORAGE_KEYS, DEFAULT_SETTINGS, getSettings, saveSettings, getEntries, saveEntries, addEntry, getIgnoredCandidates, saveIgnoredCandidates };

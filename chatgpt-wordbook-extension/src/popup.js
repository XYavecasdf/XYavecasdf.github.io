(async () => {
  const $ = (id) => document.getElementById(id);
  let settings = await WordbookStorage.getSettings();
  const entries = await WordbookStorage.getEntries();
  let suggestions = [];

  function tr(k) { return WordbookI18n.t(settings.uiLanguage, k); }
  function applyText() {
    $("title").textContent = tr("appName"); $("extractBtn").textContent = tr("extractSuggestions"); $("settingsLink").textContent = tr("settings");
    $("savedTitle").textContent = tr("appName"); $("sugTitle").textContent = tr("suggestedWords");
    $("exportJson").textContent = tr("exportJSON"); $("exportCsv").textContent = tr("exportCSV"); $("exportMd").textContent = tr("exportMD");
    $("search").placeholder = tr("search"); $("langToggle").value = settings.uiLanguage;
  }
  function speak(text, lang){ const u = new SpeechSynthesisUtterance(text); u.lang=lang||settings.defaultTTSLanguage; u.rate=settings.speechRate; u.pitch=settings.speechPitch; speechSynthesis.speak(u); }
  function renderSaved(){ const q=$("search").value.toLowerCase(); const list=entries.filter(e=>e.text.toLowerCase().includes(q)); $("savedList").innerHTML=list.length?"":`<p>${tr("noSavedWords")}</p>`; list.forEach(e=>{ const d=document.createElement('div'); d.className='card'; d.innerHTML=`<b>${e.text}</b> (${e.language})<br>${tr("context")}: ${e.context||''}<br><button data-l='${e.id}'>${tr("listen")}</button><button data-d='${e.id}'>${tr("delete")}</button>`; $("savedList").appendChild(d); }); }
  function renderSug(){ $("suggestions").innerHTML=suggestions.length?"":`<p>${tr("noSuggestions")}</p>`; suggestions.forEach((c,i)=>{ const d=document.createElement('div'); d.className='card'; d.innerHTML=`<b>${c.text}</b> ${tr("language")}:${c.language} ${tr("score")}:${c.score}<br>${tr("reason")}:${c.reason.join(', ')}<br>${tr("context")}:${c.context}<br><button data-s='${i}'>${tr("save")}</button><button data-i='${i}'>${tr("ignore")}</button>`; $("suggestions").appendChild(d);}); }
  async function persistEntries(){ await WordbookStorage.saveEntries(entries); }

  $("extractBtn").onclick = async () => {
    if (!settings.suggestionEnabled) return;
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const res = await chrome.tabs.sendMessage(tab.id, { type: "GET_VISIBLE_MESSAGES" });
    const savedSet = new Set(entries.map((e) => `${e.language}:${e.normalizedText}`));
    suggestions = WordbookExtractor.extractCandidates(res.messages || [], savedSet, settings.minSuggestionScore);
    renderSug();
  };
  document.body.onclick = async (e)=>{ const id=e.target.dataset; if(id.l){ const en=entries.find(x=>x.id===id.l); if(en) speak(en.text,en.language==='fr'?'fr-FR':settings.defaultTTSLanguage);} if(id.d){ const idx=entries.findIndex(x=>x.id===id.d); if(idx>=0){entries.splice(idx,1); await persistEntries(); renderSaved();}} if(id.s){ const c=suggestions[Number(id.s)]; const [tab]=await chrome.tabs.query({active:true,currentWindow:true}); entries.unshift({id:crypto.randomUUID(),text:c.text,normalizedText:c.text.toLowerCase(),language:c.language,sourceUrl:tab.url,pageTitle:tab.title,timestamp:new Date().toISOString(),context:c.context,note:'',sourceType:'suggestion',extractionReason:c.reason}); await persistEntries(); renderSaved(); } if(id.i){ suggestions.splice(Number(id.i),1); renderSug(); } };
  $("search").oninput=renderSaved;
  $("langToggle").onchange=async()=>{ settings.uiLanguage=$("langToggle").value; await WordbookStorage.saveSettings(settings); applyText(); renderSaved(); renderSug(); };
  $("exportJson").onclick=()=>download('wordbook.json',JSON.stringify(entries,null,2),'application/json');
  $("exportCsv").onclick=()=>download('wordbook.csv',["text,language,context,note",...entries.map(e=>`"${e.text}","${e.language}","${(e.context||'').replaceAll('"','""')}","${(e.note||'').replaceAll('"','""')}"`)].join('\n'),'text/csv');
  $("exportMd").onclick=()=>download('wordbook.md',entries.map(e=>`- **${e.text}** (${e.language})\n  - Context: ${e.context||''}\n  - Note: ${e.note||''}`).join('\n'),'text/markdown');
  $("importJson").onchange=async(e)=>{ const f=e.target.files[0]; if(!f) return; const arr=JSON.parse(await f.text()); if(!Array.isArray(arr)) return; for(const it of arr){ if(it && it.text){ const norm=it.normalizedText||it.text.toLowerCase(); if(!entries.find(x=>x.normalizedText===norm && x.language===it.language)){ entries.push({...it, id:it.id||crypto.randomUUID(), normalizedText:norm}); }}} await persistEntries(); renderSaved(); };
  function download(name, text, type){ const a=document.createElement('a'); a.href=URL.createObjectURL(new Blob([text],{type})); a.download=name; a.click(); }
  applyText(); renderSaved(); renderSug();
})();

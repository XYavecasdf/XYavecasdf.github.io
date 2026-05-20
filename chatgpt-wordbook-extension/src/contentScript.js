(() => {
  let btn;
  async function getLang() { const d = await chrome.storage.local.get("settings"); return (d.settings && d.settings.uiLanguage) || "en"; }
  function ensureButton() {
    if (btn) return btn;
    btn = document.createElement("button");
    btn.className = "wordbook-float-btn";
    btn.style.display = "none";
    document.body.appendChild(btn);
    btn.addEventListener("click", async () => {
      const text = window.getSelection().toString().trim();
      if (text) await saveManual(text);
      btn.style.display = "none";
    });
    return btn;
  }
  async function saveManual(text) {
    const meta = await chrome.runtime.sendMessage({ type: "GET_ACTIVE_TAB_META" });
    chrome.runtime.sendMessage({ type: "SAVE_ENTRY", payload: { text, sourceType: "manual", context: text, sourceUrl: meta.url, pageTitle: meta.title, language: "fr" } });
  }
  document.addEventListener("mouseup", async (e) => {
    const selected = window.getSelection().toString().trim();
    const b = ensureButton();
    if (!selected) return (b.style.display = "none");
    const lang = await getLang();
    b.textContent = window.WordbookI18n.t(lang, "saveToWordbook");
    b.style.left = `${e.pageX + 10}px`; b.style.top = `${e.pageY + 10}px`; b.style.display = "block";
  });
  chrome.runtime.onMessage.addListener((msg, _s, sendResponse) => {
    if (msg.type === "SAVE_SELECTED_TEXT") { saveManual(msg.text || window.getSelection().toString().trim()); sendResponse({ ok: true }); }
    if (msg.type === "GET_VISIBLE_MESSAGES") {
      const nodes = document.querySelectorAll('[data-message-author-role], article');
      const messages = [...nodes].map((n) => ({
        role: n.getAttribute("data-message-author-role") || (n.querySelector('[data-message-author-role="assistant"]') ? "assistant" : "unknown"),
        text: (n.innerText || "").trim()
      })).filter((m) => m.text);
      sendResponse({ messages });
    }
  });
})();

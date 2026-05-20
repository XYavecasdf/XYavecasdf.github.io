const MENU_ID = "chatgpt-wordbook-save";
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({ id: MENU_ID, title: "Save to Wordbook / 保存到生词本", contexts: ["selection"], documentUrlPatterns: ["https://chatgpt.com/*", "https://chat.openai.com/*"] });
});
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId !== MENU_ID || !tab?.id) return;
  await chrome.tabs.sendMessage(tab.id, { type: "SAVE_SELECTED_TEXT", text: info.selectionText || "" });
});
chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type === "SAVE_ENTRY") {
    chrome.storage.local.get(["entries"], (d) => {
      const entries = d.entries || [];
      const text = (msg.payload.text || "").trim();
      const normalizedText = text.toLowerCase();
      if (!entries.find((e) => e.normalizedText === normalizedText && e.language === (msg.payload.language || "fr"))) {
        entries.unshift({ id: crypto.randomUUID(), normalizedText, timestamp: new Date().toISOString(), note: "", extractionReason: [], ...msg.payload, text });
        chrome.storage.local.set({ entries });
      }
      sendResponse({ ok: true });
    });
    return true;
  }
  if (msg.type === "GET_ACTIVE_TAB_META") {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const t = tabs[0] || {};
      sendResponse({ url: t.url || "", title: t.title || "" });
    });
    return true;
  }
});

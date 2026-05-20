(() => {
  const DICT = {
    en: {
      appName: "ChatGPT Wordbook", saveToWordbook: "Save to Wordbook", suggestedWords: "Suggested Words", extractSuggestions: "Extract Suggestions", save: "Save", ignore: "Ignore", listen: "Listen", delete: "Delete", editNote: "Edit note", saveNote: "Save note", cancel: "Cancel", exportJSON: "Export JSON", exportCSV: "Export CSV", exportMD: "Export Markdown", importJSON: "Import JSON", settings: "Settings", defaultTTSLanguage: "Default TTS language", speechRate: "Speech rate", speechPitch: "Speech pitch", minimumSuggestionScore: "Minimum suggestion score", search: "Search", noSavedWords: "No saved words yet", noSuggestions: "No suggestions yet", source: "Source", context: "Context", note: "Note", language: "Language", score: "Score", reason: "Reason"
    },
    zh: {
      appName: "ChatGPT 生词本", saveToWordbook: "保存到生词本", suggestedWords: "推荐生词", extractSuggestions: "提取推荐生词", save: "保存", ignore: "忽略", listen: "播放发音", delete: "删除", editNote: "编辑笔记", saveNote: "保存笔记", cancel: "取消", exportJSON: "导出 JSON", exportCSV: "导出 CSV", exportMD: "导出 Markdown", importJSON: "导入 JSON", settings: "设置", defaultTTSLanguage: "默认朗读语言", speechRate: "语速", speechPitch: "音高", minimumSuggestionScore: "最低推荐分数", search: "搜索", noSavedWords: "暂无生词", noSuggestions: "暂无推荐生词", source: "来源", context: "上下文", note: "笔记", language: "语言", score: "分数", reason: "原因"
    }
  };
  window.WordbookI18n = {
    DICT,
    t(lang, key) { return (DICT[lang] && DICT[lang][key]) || DICT.en[key] || key; }
  };
})();

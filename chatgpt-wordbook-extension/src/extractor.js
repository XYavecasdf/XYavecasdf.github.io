(() => {
  const TOKEN_RE = /[a-zàâçéèêëîïôûùüÿñæœ'-]+/gi;
  const FR_ACCENT = /[àâçéèêëîïôûùüÿœæ]/i;
  const MARKERS = ["means", "means that", "meaning", "中文意思", "意思是", "signifie", "veut dire", "pronounced", "pronunciation", "发音"];
  const STOP_FR = new Set(["les","des","une","dans","avec","pour","pas","que","est","sur","mais","plus","comme","vous","nous","elle","ils","elles","cet","cette","ces","qui","quoi","dont"]);
  const STOP_EN = new Set(["the","and","for","that","this","with","from","your","have","will","about","into","there","their"]);

  function cleanText(text) { return text.replace(/```[\s\S]*?```/g, " ").replace(/https?:\/\/\S+/g, " ").replace(/[#*_`>[\]()-]/g, " "); }
  function contextOf(text, term) { const i = text.toLowerCase().indexOf(term); if (i < 0) return ""; return text.slice(Math.max(0, i - 60), Math.min(text.length, i + term.length + 60)).trim(); }

  function extractCandidates(messages, savedSet = new Set(), minScore = 3) {
    const freq = new Map();
    const meta = new Map();
    for (const msg of messages) {
      const cleaned = cleanText(msg.text || "");
      const tokens = cleaned.match(TOKEN_RE) || [];
      for (const raw of tokens) {
        const w = raw.toLowerCase();
        if (w.length < 3 || /^\d+$/.test(w) || STOP_FR.has(w) || STOP_EN.has(w) || savedSet.has(`fr:${w}`)) continue;
        freq.set(w, (freq.get(w) || 0) + 1);
        if (!meta.has(w)) meta.set(w, { contexts: [], assistant: msg.role === "assistant", nearMarker: false });
        const m = meta.get(w);
        m.assistant = m.assistant || msg.role === "assistant";
        if (m.contexts.length < 2) m.contexts.push(contextOf(cleaned, w));
        const lower = cleaned.toLowerCase();
        const idx = lower.indexOf(w);
        if (idx >= 0) {
          const near = lower.slice(Math.max(0, idx - 35), Math.min(lower.length, idx + w.length + 35));
          if (MARKERS.some((mk) => near.includes(mk))) m.nearMarker = true;
        }
      }
    }
    const out = [];
    for (const [w, count] of freq.entries()) {
      let score = 0; const reasons = [];
      const m = meta.get(w);
      if (FR_ACCENT.test(w)) { score += 3; reasons.push("contains French accent"); }
      if (count > 1) { score += 2; reasons.push("appears multiple times"); }
      if (m.nearMarker) { score += 2; reasons.push("near explanation marker"); }
      if (w.length >= 6) { score += 1; reasons.push("longer word"); }
      if (m.assistant) { score += 1; reasons.push("from assistant message"); }
      if (/^[a-z'-]+$/.test(w) && !FR_ACCENT.test(w)) score -= 2;
      if (score >= minScore) out.push({ key: `fr:${w}`, text: w, language: "fr", score, reason: reasons, context: m.contexts[0] || "" });
    }
    return out.sort((a,b)=>b.score-a.score);
  }

  window.WordbookExtractor = { extractCandidates };
})();

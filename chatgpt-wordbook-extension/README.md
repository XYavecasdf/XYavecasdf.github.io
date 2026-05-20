# ChatGPT Wordbook / ChatGPT 生词本 (MVP)

A Chrome Extension (Manifest V3) for language learners to save and review vocabulary from ChatGPT conversations on:
- https://chatgpt.com/*
- https://chat.openai.com/*

## What it does
- Manual save from text selection (floating button + context menu).
- Rule-based French suggestion extraction (local only, no external API).
- Suggested words panel with score, reason, context, Save/Ignore.
- Local wordbook management with search, note, delete, TTS.
- Export: JSON / CSV / Markdown.
- Import JSON with validation and dedupe.
- Bilingual UI: English + 中文.

## Load as unpacked extension
1. Open Chrome: `chrome://extensions`
2. Enable **Developer mode**.
3. Click **Load unpacked**.
4. Select the `chatgpt-wordbook-extension` folder.

## Manual save
- Select text on ChatGPT pages and click **Save to Wordbook / 保存到生词本** floating button.
- Or right-click selected text and click context menu item.

## Extract Suggestions
- Open popup and click **Extract Suggestions / 提取推荐生词**.
- The extension scans visible chat messages and shows candidates.
- Candidates are only suggested; user must click Save.

## Scoring (French MVP)
- +3 accented French chars
- +2 appears multiple times
- +2 near explanation markers
- +1 length >= 6
- +1 assistant message
- -2 English-like token without accent
- accept when score >= minimum suggestion score (default 3)

## Local storage
Uses `chrome.storage.local` for:
- entries
- ignored candidates
- settings

## Privacy
- No conversation text is sent to external servers.
- Local-first design.

## Roadmap
- Phase 1: ChatGPT-only manual save + French suggestions + TTS + export.
- Phase 2: Better phrase extraction.
- Phase 3: Spanish/Japanese/Cantonese.
- Phase 4: Spaced repetition review.
- Phase 5: Automatic language detection.
- Phase 6: Wiktionary / Forvo / OpenAI TTS integration.
- Phase 7: Anki export.
- Phase 8: Optional cloud sync.
- Phase 9: Optional AI extraction with explicit user consent.

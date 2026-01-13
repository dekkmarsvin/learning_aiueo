# Implementation Plan - Advanced Learning Features

The user wants to enhance the learning experience with localized explanations, hover translations, Furigana support, and smarter AI responses.

## User Review Required
None.

## Proposed Changes

### Backend

#### [MODIFY] [backend/src/routes/chat.ts](file:///d:/Workspace/Github/learning_aiueo/backend/src/routes/chat.ts)
- Update `ChatRequestBody` to include `targetLang` (e.g., "tc" or "en").
- Update `StructuredResponse` to include `analysisTranslation` and `grammarNotesTranslation` (or just `analysisTranslated` etc).
- Update `systemPrompt`:
    - Improve quality ("Request 4").
    - Instruct to provide translations for analysis and grammar notes in the `targetLang`.
- Update `registerChat` to pass `targetLang` to the prompt logic.

#### [NEW] [backend/src/routes/furigana.ts](file:///d:/Workspace/Github/learning_aiueo/backend/src/routes/furigana.ts)
- Create a new endpoint `/api/furigana` that accepts `{ text: string }`.
- Use LLM to generate a segmented structure like `[{"surface": "天気", "reading": "てんき"}, {"surface": "は", "reading": ""}, ...]` for exact Furigana mapping.

#### [NEW] [backend/src/routes/hover.ts](file:///d:/Workspace/Github/learning_aiueo/backend/src/routes/hover.ts) (or reuse translate?)
- Create `/api/hover` (or overload `translate`) that accepts `{ text: string, targetLang: string }`.
- Check database cache for `(text, targetLang)`.
    - If found, return cached.
    - If not, call LLM to translate, store in DB, return.
- Needs a new Store method `getCachedTranslation` / `setCachedTranslation`.

#### [MODIFY] [backend/src/store/chatStore.ts](file:///d:/Workspace/Github/learning_aiueo/backend/src/store/chatStore.ts)
- Add methods for translation caching.

#### [MODIFY] [backend/src/app.ts](file:///d:/Workspace/Github/learning_aiueo/backend/src/app.ts)
- Register new routes.

### Frontend

#### [MODIFY] [frontend/src/lib/api.ts](file:///d:/Workspace/Github/learning_aiueo/frontend/src/lib/api.ts)
- Update `sendMessage` to send `targetLang`.
- Add `getFurigana` function.
- Add `getHoverTranslation` function.

#### [MODIFY] [frontend/src/routes/+page.svelte](file:///d:/Workspace/Github/learning_aiueo/frontend/src/routes/+page.svelte)
- **Request 1:** In `.panel.analysis` and `.panel.hints`, display the translated text below the original Japanese text.
- **Request 2:** Add `on:mouseenter` behavior to `.bubble.assistant` (and maybe `user` too if desired) to fetch and show translation tooltip.
- **Request 3:** Improve Input.
    - This is tricky. Textarea can't show Ruby.
    - APPROACH: Overlay a `div` on top of the `textarea` that renders the Ruby text. The `textarea` becomes transparent (or same font/size) so typing aligns.
    - OR: Display the "Input Preview" with Furigana *above* the textarea (like the current `kana-hint` but rich HTML). Request says "above Kanji", so a formatted line above text box is acceptable and easier than complex overlay alignment. I will upgrade the `kana-hint` area to use the `/api/furigana` result.

## Verification Plan

### Automated Tests
- None.

### Manual Verification
1. **Analysis Translation:** Send a message. Check if Analysis/Notes have a secondary language text below them matching the header language (TC/EN).
2. **Hover Translation:** Hover over a chat bubble. Check if a tooltip appears with translation. Check Network tab to see 2nd hover on same text hits cache (no new API call) or response is instant.
3. **Furigana:** Type "天気". Check if "てんき" appears specifically above "天気" in the hint area (not just a full string conversion).
4. **Smart AI:** Check if responses feel more natural (subjective, but checking prompt change).

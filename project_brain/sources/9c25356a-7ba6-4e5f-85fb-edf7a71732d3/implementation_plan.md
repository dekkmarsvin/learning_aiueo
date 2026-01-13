# Improve Japanese Input Suggestions

The goal is to enhance the typing experience by providing Romaji hints and Katakana auto-completions.

## User Review Required
None. These are UI enhancements.

## Proposed Changes

### Frontend

#### [MODIFY] [+page.svelte](file:///d:/Workspace/Github/learning_aiueo/frontend/src/routes/+page.svelte)
- Change `romajiHint` to `kanaHint` using `toKana` (or `toHiragana`/`toKatakana`).
- Display `kanaHint` above the textarea.
- Move (or add) `suggestions` display to the `.chat-input-wrapper`.
- Style the suggestions as clickable chips above the input.

### Backend

#### [MODIFY] [chat.ts](file:///d:/Workspace/Github/learning_aiueo/backend/src/routes/chat.ts)
- Update `systemPrompt` to request `suggestions` as `{ text: string, reading: string }[]`.
- Update `StructuredResponse` type.

#### [NEW] [translate.ts](file:///d:/Workspace/Github/learning_aiueo/backend/src/routes/translate.ts)
- Create new route `POST /api/translate`.
- Accepts `{ text: string, sourceLang?: string }`.
- Uses LLM to translate text to Japanese.

### Frontend

#### [MODIFY] [types.ts](file:///d:/Workspace/Github/learning_aiueo/frontend/src/lib/types.ts)
- Update `ChatResponse` `suggestions` type to `{ text: string, reading: string }[]`.
- Add `TranslateRequest` and `TranslateResponse` types.

#### [MODIFY] [api.ts](file:///d:/Workspace/Github/learning_aiueo/frontend/src/lib/api.ts)
- Add `translateText` function.

#### [MODIFY] [+page.svelte](file:///d:/Workspace/Github/learning_aiueo/frontend/src/routes/+page.svelte)
- Update `suggestions` usage to render `.text`.
- Add state `overrideHint` (string | null).
- Update click handler for suggestions: set `message = suggestion.text` and `overrideHint = suggestion.reading`.
- Update `kanaHint` reactive statement: `$: kanaHint = overrideHint || toKana(message, ...)`.
- Clear `overrideHint` on manual input (how? `on:input` handler or reactive check? *Plan*: `on:input={() => overrideHint = null}`).
- **Translation Box**:
    - Add a new section below the middle column (Analysis).
    - Textarea for input, "Translate" button, Output display.
    - Button to copy output to main chat input? (Optional but good).

## Verification Plan

### Manual Verification
1.  **Romaji Hint**:
    - Type "k" -> Hint should show "k".
    - Type "ka" -> Hint should show "ka".
    - Type "か" -> Hint should show "ka".
    - Type "こんにちは" -> Hint should show "konnichiwa".
2.  **Katakana Prediction**:
    - Type "ア" -> Should suggest "アメリカ", "アイス", etc.
    - Type "イン" -> Should suggest "インターネット", etc.
    - Verify selecting a suggestion (if interactive) or just viewing it works. *Note: User asked for "input prediction", usually implies clickable or selectable. I'll assume display first, user can copy or type it.*
    - Actually, prediction usually means I can choose it to complete my input. I should probably make them clickable if possible, like the current "suggestions"?
    - The current `suggestions` in `+page.svelte` are just `li` items. `kanaCandidates` are also just `li`. I'll make them similar.

### Automated Tests
- No existing E2E tests found easily runable without full stack. I will rely on manual verification (browser tool) and unit tests if I write complex logic (unlikely for a simple list filter).

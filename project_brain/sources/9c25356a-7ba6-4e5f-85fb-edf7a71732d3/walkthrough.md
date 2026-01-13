# Japanese Input Suggestions Walkthrough

I have implemented the requested features to improve Japanese input suggestions.

## Changes

### 1. Vocabulary Module
Created `frontend/src/lib/vocabulary.ts` containing a dictionary of common Katakana words and a matching function.

### 2. Frontend Logic (`+page.svelte`)
- **Kana Hint**: Changed the input hint to display Kana (Hiragana/Katakana) using `wanakana`.
- **Suggestions & Predictions**: 
    - Moved both prediction chips and recommended reply chips to the input area (`.chat-input-wrapper`) for better accessibility.
    - Updated recommended replies to set an override hint (reading) when clicked, so the user sees the pronunciation.
- **Translation**: Added a "Translation" panel below the analysis section. Allows users to translate text (e.g., English) to Japanese and copy it to the chat input.
- **Cleanup**: Removed redundant "Predictions" and "Recommended Replies" sections from the side panel.

### 3. Backend Logic (`backend/`)
- **Chat API**: Updated prompt to return suggestions with readings (`{ text, reading }`).
- **Translation API**: Created `/api/translate` endpoint using the LLM provider to translate text to Japanese.

### 4. UI Updates
- Styled `kana-hint` to be clear and positioned above the input.
- Added `prediction-chip` and `suggestion-chip` styles for a cohesive look in the input area.
- Added styles for the translation text area and buttons.

## Verification Results

### Automated Checks
ran `npm run check`:
- **Source Files**: No errors found in `+page.svelte` or `vocabulary.ts`.
- **Config**: One known type error in `vite.config.ts` regarding Vitest configuration, which does not affect the application runtime.

### Manual Verification Steps
1. Open the app.
2. Type in the chat box.
   - **Kana Hint**: Verify text appears in Kana (Hiragana/Katakana) above the box.
   - **Prediction**: Type "ア" or similar. Verify prediction chips appear *above* the input box.
   - **Recommended Replies**: Verify suggestion chips appear above the input box when it is empty (if applicable).
3. **Translation**:
   - Scroll to "Translation" panel.
   - Enter "I want to eat sushi".
   - Click "Translate to Japanese".
   - Verify output "寿司が食べたいです" (or similar).
   - Click "Use this" and verify it populates the main chat input.
4. **Suggestions**:
   - Send the message.
   - Wait for reply and suggestions.
   - Click a suggestion chip.
   - Verify it populates the input AND displays its reading (Kana) in the hint area above the input.

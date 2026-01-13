# LLM-Generated Topic Sentence Enhancement

## Goal
Transform topic keywords (e.g., "仕事") into complete, natural Japanese sentences using LLM, with database caching to avoid redundant API calls.

## Current State
- Topics are displayed as single keywords: "仕事", "勉強", "週末の予定"
- Generated on frontend without LLM involvement

## Proposed Changes

### Backend

#### 1. Database Schema
Add a new collection `topic_prompts` to cache generated sentences:

```typescript
{
  topic: string,          // e.g., "仕事"
  context: string,        // e.g., "weekday" | "weekend" | "holiday:元日"
  prompt: string,         // Generated sentence
  createdAt: Date,
  updatedAt: Date
}
```

#### 2. ChatStore Updates (`chatStore.ts`)
Add caching methods:

```typescript
interface ChatStore {
  // ... existing methods
  getCachedTopicPrompt(topic: string, context: string): Promise<string | null>;
  setCachedTopicPrompt(topic: string, context: string, prompt: string): Promise<void>;
}
```

#### 3. New API Endpoint (`topicPrompt.ts`)
Create `/api/topic-prompt` endpoint:

```typescript
POST /api/topic-prompt
Body: {
  topic: string,      // e.g., "仕事"
  context: string     // e.g., "weekday"
}

Response: {
  topic: string,
  prompt: string,     // e.g., "今日の仕事について話しましょう"
  cached: boolean
}
```

**Logic:**
1. Check cache using `getCachedTopicPrompt(topic, context)`
2. If cached, return immediately
3. If not cached:
   - Call LLM with prompt: "話題「{topic}」について、日本語学習者が練習できる簡潔な会話の始め方を一文で提案してください。20文字以内で。"
   - Cache the result
   - Return generated prompt

#### 4. Register Route (`app.ts`)
```typescript
import { registerTopicPrompt } from './routes/topicPrompt.js';
// ...
await registerTopicPrompt(app, provider, store);
```

### Frontend

#### 1. API Client (`api.ts`)
Add new function:

```typescript
export const getTopicPrompt = async (topic: string, context: string): Promise<string> => {
  const response = await fetch(`${API_BASE}/api/topic-prompt`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ topic, context })
  });
  const data = await response.json();
  return data.prompt;
};
```

#### 2. Topic Suggestions (`topicSuggestions.ts`)
Update to return objects with both keyword and context:

```typescript
type TopicSuggestion = {
  keyword: string;      // "仕事"
  context: string;      // "weekday"
  description: string;  // "Work"
};

export const getTopicSuggestions = (): TopicSuggestion[] => {
  // ... existing logic
  const isWeekend = day === 0 || day === 6;
  const context = isWeekend ? 'weekend' : 'weekday';
  
  if (isWeekend) {
    suggestions.push(
      { keyword: '週末の予定', context: 'weekend', description: 'Weekend plans' },
      // ...
    );
  } else {
    suggestions.push(
      { keyword: '仕事', context: 'weekday', description: 'Work' },
      // ...
    );
  }
  
  return suggestions;
};
```

#### 3. Page Component (`+page.svelte`)
Update to fetch prompts asynchronously:

```typescript
let topicPrompts: Record<string, string> = {};

const loadTopicPrompts = async () => {
  const suggestions = getTopicSuggestions();
  for (const suggestion of suggestions) {
    try {
      const prompt = await getTopicPrompt(suggestion.keyword, suggestion.context);
      topicPrompts[suggestion.keyword] = prompt;
    } catch (e) {
      console.error(e);
      topicPrompts[suggestion.keyword] = suggestion.keyword; // Fallback
    }
  }
};

onMount(loadTopicPrompts);
```

**UI Update:**
```svelte
{#each topicSuggestions as suggestion}
  <button
    class="topic-chip"
    on:click={() => (topic = topicPrompts[suggestion.keyword] || suggestion.keyword)}
    title={suggestion.description}
  >
    {topicPrompts[suggestion.keyword] || suggestion.keyword}
  </button>
{/each}
```

## LLM Prompt Design

**System Prompt:**
```
あなたは日本語会話の練習を支援するアシスタントです。
与えられた話題について、学習者が会話を始めやすい簡潔な一文を提案してください。
```

**User Prompt:**
```
話題: {topic}
文脈: {context}

この話題について、日本語学習者が会話練習を始めるための簡潔な一文を提案してください。
20文字以内で、自然な日本語で書いてください。
```

**Example Outputs:**
- 仕事 (weekday) → "今日の仕事はどうでしたか？"
- 週末の予定 (weekend) → "週末は何をしますか？"
- クリスマス (holiday:クリスマス) → "クリスマスの予定を教えてください"

## Caching Strategy

**Cache Key:** `${topic}:${context}`

**Benefits:**
- Reduces LLM API calls
- Faster response time for repeat visits
- Cost-effective

**Cache Duration:** Indefinite (topic prompts are stable)

## Verification Plan

1. **Backend Testing:**
   - Call `/api/topic-prompt` with topic "仕事" and context "weekday"
   - Verify LLM generates a short sentence
   - Call again and verify cache hit (`cached: true`)

2. **Frontend Testing:**
   - Load page on Monday → verify chips show full sentences
   - Click chip → verify topic field populated with sentence
   - Check network tab → verify only initial calls to API

3. **Database Verification:**
   - Check `topic_prompts` collection has entries

## Alternative Approaches

### Option A: Pre-generate All Prompts
- Generate all topic prompts at build time
- Store in static JSON file
- **Pros:** No runtime LLM calls
- **Cons:** Less flexible, harder to update

### Option B: Client-side LLM
- Use browser-based LLM
- **Pros:** No backend needed
- **Cons:** Performance issues, larger bundle

### Option C: Hybrid (Recommended)
- Cache in DB (current proposal)
- Pre-populate common topics on first deployment
- **Pros:** Best of both worlds

# Smart Topic Suggestion Feature

## Goal
Transform the topic input field into an intelligent suggestion system that recommends conversation topics based on:
- **Day of week** (weekday vs. weekend)
- **Japanese holidays** and special dates
- **Seasons**

## Proposed Changes

### Frontend (`+page.svelte`)

#### 1. Topic Suggestion Logic
Create a utility function that generates topic suggestions:

```typescript
const getTopicSuggestions = () => {
  const now = new Date();
  const day = now.getDay(); // 0=Sunday, 6=Saturday
  const month = now.getMonth() + 1;
  const date = now.getDate();
  
  // Check if weekend
  const isWeekend = day === 0 || day === 6;
  
  // Check for Japanese holidays
  const holiday = checkJapaneseHoliday(month, date);
  
  // Generate suggestions based on context
  const suggestions = [];
  
  if (holiday) {
    suggestions.push({
      topic: holiday.topic,
      description: holiday.description
    });
  }
  
  if (isWeekend) {
    suggestions.push(
      { topic: "週末の予定", description: "Weekend plans" },
      { topic: "趣味", description: "Hobbies" },
      { topic: "旅行", description: "Travel" }
    );
  } else {
    suggestions.push(
      { topic: "仕事", description: "Work" },
      { topic: "勉強", description: "Study" },
      { topic: "通勤", description: "Commute" }
    );
  }
  
  // Add seasonal topics
  const season = getSeason(month);
  suggestions.push(...getSeasonalTopics(season));
  
  return suggestions;
};
```

#### 2. UI Changes
- Replace or enhance the current topic input with a **suggestion dropdown or chips**
- Show 3-5 suggested topics based on current date/time
- Allow users to click a suggestion to populate the topic field
- Keep the manual input option available

**Proposed UI Layout:**
```
[話題 ▼]  [建議: 週末の予定 | 趣味 | 旅行]
```

or

```
💡 今日の話題候補：
[週末の予定] [趣味] [旅行]
話題: [____________]
```

#### 3. Holiday Database
Create a simple holiday/special date mapping:

```typescript
const japaneseHolidays = {
  "1-1": { name: "元日", topic: "お正月", description: "New Year" },
  "2-14": { name: "バレンタインデー", topic: "バレンタイン", description: "Valentine's Day" },
  "3-3": { name: "ひな祭り", topic: "ひな祭り", description: "Girls' Day" },
  "4-1": { name: "エイプリルフール", topic: "嘘とジョーク", description: "April Fools" },
  "5-5": { name: "こどもの日", topic: "こどもの日", description: "Children's Day" },
  "7-7": { name: "七夕", topic: "七夕", description: "Star Festival" },
  "10-31": { name: "ハロウィン", topic: "ハロウィン", description: "Halloween" },
  "12-25": { name: "クリスマス", topic: "クリスマス", description: "Christmas" },
  // Add more as needed
};
```

#### 4. Seasonal Topics
```typescript
const getSeasonalTopics = (season: string) => {
  const topics = {
    spring: [{ topic: "お花見", description: "Cherry blossoms" }],
    summer: [{ topic: "夏休み", description: "Summer vacation" }],
    autumn: [{ topic: "紅葉", description: "Fall foliage" }],
    winter: [{ topic: "年末年始", description: "Year-end/New Year" }]
  };
  return topics[season] || [];
};
```

## Verification Plan

### Manual Testing
1. Change system date to different days (Monday, Saturday, etc.)
2. Verify correct suggestions appear
3. Click suggestion and confirm topic is populated
4. Test on special dates (holidays)
5. Verify seasonal topics rotate correctly

### Browser Testing
1. Load the app on a weekday → should see work-related topics
2. Load the app on a weekend → should see leisure-related topics
3. Click a suggestion → topic field should populate
4. Manual input should still work

## Alternative Approaches

### Option A: Simple Button Approach
- Add a "💡 おすすめ" (Suggestions) button next to the topic input
- Clicking shows a dropdown with 3-5 suggestions
- Minimal UI changes

### Option B: Auto-populate on Load
- Automatically fill the topic field with the most relevant suggestion
- User can accept or change it

### Option C: Chips Display (Recommended)
- Show 3-4 topic chips above or below the input
- Clicking a chip populates the topic field
- Clean and modern UI

## Implementation Notes
- All logic will be in the frontend (no backend changes needed)
- Use browser's Date API for date/time detection
- Lightweight and fast
- Easily extensible for more holidays/events

import type { Language } from './types';

export type TopicSuggestion = {
    keyword: string;
    context: string;
    description: string;
};

type Holiday = {
    name: string;
    topic: string;
    description: string;
};

const japaneseHolidays: Record<string, Holiday> = {
    '1-1': { name: '元日', topic: 'お正月', description: 'New Year' },
    '2-11': { name: '建国記念の日', topic: '日本の歴史', description: 'National Foundation Day' },
    '2-14': { name: 'バレンタインデー', topic: 'バレンタイン', description: "Valentine's Day" },
    '3-3': { name: 'ひな祭り', topic: 'ひな祭り', description: "Girls' Day" },
    '3-14': { name: 'ホワイトデー', topic: 'ホワイトデー', description: 'White Day' },
    '4-1': { name: 'エイプリルフール', topic: '嘘とジョーク', description: 'April Fools' },
    '4-29': { name: '昭和の日', topic: '昭和時代', description: 'Showa Day' },
    '5-3': { name: '憲法記念日', topic: '日本の憲法', description: 'Constitution Day' },
    '5-4': { name: 'みどりの日', topic: '自然と環境', description: 'Greenery Day' },
    '5-5': { name: 'こどもの日', topic: 'こどもの日', description: "Children's Day" },
    '7-7': { name: '七夕', topic: '七夕', description: 'Star Festival' },
    '9-23': { name: '秋分の日', topic: '秋の季節', description: 'Autumnal Equinox' },
    '10-31': { name: 'ハロウィン', topic: 'ハロウィン', description: 'Halloween' },
    '11-3': { name: '文化の日', topic: '文化と芸術', description: 'Culture Day' },
    '11-23': { name: '勤労感謝の日', topic: '仕事と感謝', description: 'Labor Thanksgiving Day' },
    '12-25': { name: 'クリスマス', topic: 'クリスマス', description: 'Christmas' }
};

const getSeason = (month: number): 'spring' | 'summer' | 'autumn' | 'winter' => {
    if (month >= 3 && month <= 5) return 'spring';
    if (month >= 6 && month <= 8) return 'summer';
    if (month >= 9 && month <= 11) return 'autumn';
    return 'winter';
};

const getSeasonalTopics = (season: string): { topic: string; description: string }[] => {
    const topics: Record<string, { topic: string; description: string }[]> = {
        spring: [{ topic: 'お花見', description: 'Cherry blossoms' }],
        summer: [{ topic: '夏休み', description: 'Summer vacation' }],
        autumn: [{ topic: '紅葉', description: 'Fall foliage' }],
        winter: [{ topic: '年末年始', description: 'Year-end/New Year' }]
    };
    return topics[season] || [];
};

export const getTopicSuggestions = (): TopicSuggestion[] => {
    const now = new Date();
    const day = now.getDay(); // 0=Sunday, 6=Saturday
    const month = now.getMonth() + 1;
    const date = now.getDate();

    const suggestions: TopicSuggestion[] = [];

    // Check for holiday
    const holidayKey = `${month}-${date}`;
    const holiday = japaneseHolidays[holidayKey];
    if (holiday) {
        suggestions.push({
            keyword: holiday.topic,
            context: `holiday:${holiday.name}`,
            description: holiday.description
        });
    }

    // Check if weekend
    const isWeekend = day === 0 || day === 6;
    const dayContext = isWeekend ? 'weekend' : 'weekday';

    if (isWeekend) {
        suggestions.push(
            { keyword: '週末の予定', context: dayContext, description: 'Weekend plans' },
            { keyword: '趣味', context: dayContext, description: 'Hobbies' }
        );
    } else {
        suggestions.push(
            { keyword: '仕事', context: dayContext, description: 'Work' },
            { keyword: '勉強', context: dayContext, description: 'Study' }
        );
    }

    // Add seasonal topic
    const season = getSeason(month);
    const seasonalTopics = getSeasonalTopics(season);
    if (seasonalTopics.length > 0) {
        suggestions.push({
            keyword: seasonalTopics[0].topic,
            context: `season:${season}`,
            description: seasonalTopics[0].description
        });
    }

    // Limit to 4 suggestions
    return suggestions.slice(0, 4);
};

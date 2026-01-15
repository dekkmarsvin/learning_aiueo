
import { createGeminiProvider } from '../backend/src/providers/gemini.js';
import { NewsScraper } from '../backend/src/services/newsScraper.js';
import { NewsStore, NewsItem } from '../backend/src/store/newsStore.js';
import dotenv from 'dotenv';
import path from 'path';

// Mock Store
class MockNewsStore implements NewsStore {
    async saveDailyNews(news: NewsItem[]) {
        console.log('--- MOCK STORE SAVE ---');
        console.log(`Saving ${news.length} items.`);
        news.forEach(n => {
            console.log(`[${n.source}] ${n.title} (Trans: ${n.translatedTitle})`);
            console.log(`URL: ${n.url}`);
            console.log(`Content length: ${n.content?.length}`);
        });
        console.log('-----------------------');
    }
    async getLatestNews(limit?: number): Promise<NewsItem[]> { return []; }
    async hasNewsForToday(): Promise<boolean> { return false; }
}

const main = async () => {
    console.log('Starting News Scraper DEBUG...');

    // Load from root .env if backend/.env doesn't exist or just manually
    dotenv.config({ path: path.resolve('.env') });

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        console.error('GEMINI_API_KEY not found in .env');
        process.exit(1);
    }
    console.log('API Key found: ' + apiKey.substring(0, 5) + '...');

    const provider = createGeminiProvider({ apiKey, model: 'gemini-1.5-flash' });
    const store = new MockNewsStore();
    const scraper = new NewsScraper(provider, store);

    console.log('Fetching news...');
    try {
        await scraper.fetchTopNews();
    } catch (e) {
        console.error('Error in fetchTopNews:', e);
    }

    process.exit(0);
};

main().catch(console.error);

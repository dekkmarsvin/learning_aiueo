import { createGeminiProvider } from '../backend/src/providers/gemini.js';
import { MongoNewsStore } from '../backend/src/store/newsStore.js';
import { NewsScraper } from '../backend/src/services/newsScraper.js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve('backend/.env') });

const main = async () => {
    console.log('Starting News Scraper Test...');

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        console.error('GEMINI_API_KEY not found');
        process.exit(1);
    }

    const provider = createGeminiProvider({ apiKey, model: 'gemini-1.5-flash' });
    const store = new MongoNewsStore();
    const scraper = new NewsScraper(provider, store);

    console.log('Fetching news...');
    await scraper.fetchTopNews();

    console.log('Verifying storage...');
    const saved = await store.getLatestNews(5);
    console.log('Saved News:', JSON.stringify(saved, null, 2));

    process.exit(0);
};

main().catch(console.error);

import rateLimit from '@fastify/rate-limit';
import { config } from './config.js';
import { createProvider } from './providers/index.js';
import { createApp } from './app.js';
import { MongoChatStore } from './store/chatStore.js';
import { MongoNewsStore } from './store/newsStore.js';
import { NewsScraper } from './services/newsScraper.js';

const provider = createProvider();
const store = new MongoChatStore();
const newsStore = new MongoNewsStore();

// Init scraper
const scraper = new NewsScraper(provider, newsStore);
scraper.scheduleScraping();
// Run once on startup for dev/testing? Maybe not, could break rate limits or be annoying.
// But user requested "fetch news". Maybe trigger if empty?
// For now, adhere to "daily update". But for demo/verification, maybe I should add a check.
// Check if we need to fetch news on startup (if missing for today)
const hasNews = await newsStore.hasNewsForToday();
if (!hasNews) {
    console.log('No news found for today. Fetching...');
    scraper.fetchTopNews();
} else {
    console.log('News for today already exists. Skipping startup fetch.');
}

const app = await createApp(provider, store, newsStore);

await app.register(rateLimit, {
    max: 100, // 100 requests
    timeWindow: '1 minute' // per minute
});

app.listen({ port: config.port, host: '0.0.0.0' });

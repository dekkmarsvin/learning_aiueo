import Fastify from 'fastify';
import cors from '@fastify/cors';
import { registerHealth } from './routes/health.js';
import { registerChat } from './routes/chat.js';
import { registerTranslate } from './routes/translate.js';
import { registerFurigana } from './routes/furigana.js';
import { registerHover } from './routes/hover.js';
import { registerTopicPrompt } from './routes/topicPrompt.js';
import { registerAnalyze } from './routes/analyze.js';
import type { LLMProvider } from './providers/types.js';
import { registerNews } from './routes/news.js';
import type { NewsStore } from './store/newsStore.js';
import type { ChatStore } from './store/chatStore.js';

import { dictionaryService } from './services/dictionary.js';

export const createApp = async (provider: LLMProvider, store: ChatStore, newsStore: NewsStore) => {
	const app = Fastify({ logger: true });

	// Initialize Dictionary Service
	await dictionaryService.initialize();

	// CORS configuration
	// In production, set ALLOWED_ORIGINS to your domain(s), comma-separated.
	// Example: https://myapp.com,http://localhost:3000
	const allowedOrigins = process.env.ALLOWED_ORIGINS
		? process.env.ALLOWED_ORIGINS.split(',')
		: true; // Default to allow all if not set (for dev/convenience)

	await app.register(cors, {
		origin: allowedOrigins
	});

	await registerHealth(app);
	await registerChat(app, provider, store);
	await registerTranslate(app, provider);
	await registerFurigana(app, provider);
	await registerHover(app, provider, store);
	await registerTopicPrompt(app, provider, store);
	await registerAnalyze(app, provider);
	await registerNews(app, newsStore);

	return app;
};

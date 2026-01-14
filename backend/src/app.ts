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
import type { ChatStore } from './store/chatStore.js';

export const createApp = async (provider: LLMProvider, store: ChatStore) => {
	const app = Fastify({ logger: true });

	await app.register(cors, {
		origin: true
	});

	await registerHealth(app);
	await registerChat(app, provider, store);
	await registerTranslate(app, provider);
	await registerFurigana(app, provider);
	await registerHover(app, provider, store);
	await registerTopicPrompt(app, provider, store);
	await registerAnalyze(app, provider);

	return app;
};

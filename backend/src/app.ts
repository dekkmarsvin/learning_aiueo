import Fastify from 'fastify';
import cors from '@fastify/cors';
import { registerHealth } from './routes/health.js';
import { registerChat } from './routes/chat.js';
import type { LLMProvider } from './providers/types.js';
import type { ChatStore } from './store/chatStore.js';

export const createApp = async (provider: LLMProvider, store: ChatStore) => {
	const app = Fastify({ logger: true });

	await app.register(cors, {
		origin: true
	});

	await registerHealth(app);
	await registerChat(app, provider, store);

	return app;
};

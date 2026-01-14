import Fastify from 'fastify';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import { registerHealth } from './routes/health.js';
import { registerChat } from './routes/chat.js';
import { registerTranslate } from './routes/translate.js';
import { registerFurigana } from './routes/furigana.js';
import { registerHover } from './routes/hover.js';
import { registerTopicPrompt } from './routes/topicPrompt.js';
import type { LLMProvider } from './providers/types.js';
import type { ChatStore } from './store/chatStore.js';
import { config } from './config.js';

const resolveAuthToken = (headers: Record<string, string | string[] | undefined>) => {
	const apiKey = headers['x-api-key'];
	if (typeof apiKey === 'string' && apiKey.length) return apiKey;
	if (Array.isArray(apiKey) && apiKey[0]) return apiKey[0];

	const auth = headers.authorization;
	if (!auth) return '';
	const value = Array.isArray(auth) ? auth[0] : auth;
	const bearerPrefix = 'Bearer ';
	if (value.startsWith(bearerPrefix)) return value.slice(bearerPrefix.length).trim();
	return value.trim();
};

export const createApp = async (provider: LLMProvider, store: ChatStore) => {
	const app = Fastify({ logger: true });

	await app.register(cors, {
		origin: (origin, callback) => {
			if (!origin) return callback(null, true);
			if (config.corsOrigins.includes('*')) return callback(null, true);
			return callback(null, config.corsOrigins.includes(origin));
		}
	});

	await app.register(rateLimit, {
		max: config.rateLimitMax,
		timeWindow: config.rateLimitWindowMs,
		allowList: (request) => request.url === '/api/health',
		keyGenerator: (request) =>
			resolveAuthToken(request.headers as Record<string, string | string[] | undefined>) || request.ip
	});

	app.addHook('onRequest', async (request, reply) => {
		if (!request.url.startsWith('/api/') || request.url === '/api/health') return;
		if (!config.apiAuthToken) {
			request.log.error('API_AUTH_TOKEN is not configured');
			return reply.status(500).send({ error: 'api auth not configured' });
		}
		const provided = resolveAuthToken(request.headers as Record<string, string | string[] | undefined>);
		if (provided !== config.apiAuthToken) {
			return reply.status(401).send({ error: 'unauthorized' });
		}
	});

	await registerHealth(app);
	await registerChat(app, provider, store);
	await registerTranslate(app, provider);
	await registerFurigana(app, provider);
	await registerHover(app, provider, store);
	await registerTopicPrompt(app, provider, store);

	return app;
};

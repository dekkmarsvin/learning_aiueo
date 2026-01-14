import dotenv from 'dotenv';

dotenv.config();

export type ProviderName = 'openai' | 'gemini' | 'lmstudio';

export const config = {
	port: Number(process.env.PORT || 8080),
	mongoUri: process.env.MONGODB_URI || 'mongodb://mongo:27017',
	mongoDb: process.env.MONGODB_DB || 'aiueo',
	provider: (process.env.LLM_PROVIDER || 'lmstudio') as ProviderName,
	model: process.env.LLM_MODEL || 'gpt-4o-mini',
	baseUrl: process.env.LLM_BASE_URL || 'http://host.docker.internal:1234',
	apiKey: process.env.LLM_API_KEY || '',
	geminiApiKey: process.env.GEMINI_API_KEY || '',
	apiAuthToken: process.env.API_AUTH_TOKEN || '',
	corsOrigins: (process.env.CORS_ORIGINS || 'http://localhost:3000')
		.split(',')
		.map((origin) => origin.trim())
		.filter(Boolean),
	rateLimitMax: Number(process.env.RATE_LIMIT_MAX || 60),
	rateLimitWindowMs: Number(process.env.RATE_LIMIT_WINDOW_MS || 60_000)
};

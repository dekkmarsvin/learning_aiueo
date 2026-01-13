import { config } from '../config.js';
import { createOpenAICompatibleProvider } from './openaiCompatible.js';
import { createGeminiProvider } from './gemini.js';
import type { LLMProvider } from './types.js';

export const createProvider = (): LLMProvider => {
	switch (config.provider) {
		case 'openai':
			return createOpenAICompatibleProvider({
				baseUrl: config.baseUrl || 'https://api.openai.com',
				apiKey: config.apiKey,
				model: config.model
			});
		case 'gemini':
			return createGeminiProvider({
				apiKey: config.geminiApiKey,
				model: config.model
			});
		case 'lmstudio':
		default:
			return createOpenAICompatibleProvider({
				baseUrl: config.baseUrl,
				apiKey: config.apiKey,
				model: config.model
			});
	}
};

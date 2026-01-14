import type { FastifyInstance } from 'fastify';
import type { LLMProvider, ChatMessage } from '../providers/types.js';
import type { ChatStore } from '../store/chatStore.js';
import { cacheService } from '../services/cache.js';

type HoverRequestBody = {
    text: string;
    targetLang?: string;
};

const getSystemPrompt = (targetLang: string) => `You are a translator.
Translate the following Japanese text into ${targetLang === 'en' ? 'English' : 'Traditional Chinese (繁體中文)'}.
Return ONLY the translation as a string. No JSON, no explanations.
Keep it concise as it will be shown in a tooltip.`;

export const registerHover = async (
    app: FastifyInstance,
    provider: LLMProvider,
    store: ChatStore
) => {
    app.post<{ Body: HoverRequestBody }>('/api/hover', async (request, reply) => {
        const { text, targetLang = 'tc' } = request.body || {};

        if (!text || typeof text !== 'string') {
            return reply.status(400).send({ error: 'text is required' });
        }

        // 1. Check cache
        if (text.length > 100) {
            return reply.status(400).send({ error: 'text length must be <= 100 characters' });
        }

        // 1. Check cache
        const cacheKey = cacheService.generateKey('hover', { text, targetLang });
        const cached = cacheService.get<{ translation: string; cached: boolean }>(cacheKey);
        if (cached) {
            return { ...cached, cached: true };
        }

        // 2. Call LLM
        const messages: ChatMessage[] = [
            { role: 'system', content: getSystemPrompt(targetLang) },
            { role: 'user', content: text }
        ];

        try {
            const llmResult = await provider.generate(messages);
            const translation = llmResult.content.trim();

            // 3. Store in cache
            const result = { translation, cached: false };
            cacheService.set(cacheKey, result);

            return result;
        } catch (err) {
            request.log.error(err);
            return reply.status(500).send({ error: 'Translation failed' });
        }
    });
};

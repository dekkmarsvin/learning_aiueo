import type { FastifyInstance } from 'fastify';
import type { LLMProvider } from '../providers/types.js';
import { cacheService } from '../services/cache.js';
import { dictionaryService } from '../services/dictionary.js';

type FuriganaRequestBody = {
    text: string;
};

type FuriganaSegment = {
    surface: string;
    reading: string;
};

export const registerFurigana = async (
    app: FastifyInstance,
    provider: LLMProvider
) => {
    app.post<{ Body: FuriganaRequestBody }>('/api/furigana', async (request, reply) => {
        const { text } = request.body || {};

        if (!text || typeof text !== 'string') {
            return reply.status(400).send({ error: 'text is required' });
        }

        if (text.length > 500) {
            return reply.status(400).send({ error: 'text length must be <= 500 characters' });
        }

        const cacheKey = cacheService.generateKey('furigana', { text });
        const cached = cacheService.get<FuriganaSegment[]>(cacheKey);
        if (cached) {
            return cached;
        }

        // Optimization: if no kanji, return as is
        if (!dictionaryService.hasKanji(text)) {
            return [{ surface: text, reading: '' }];
        }

        try {
            // Use local dictionary service instead of LLM
            const segments = await dictionaryService.parseSegments(text);

            cacheService.set(cacheKey, segments);
            return segments;
        } catch (err) {
            request.log.error(err);
            // Fallback on error
            return [{ surface: text, reading: '' }];
        }
    });
};

import type { FastifyInstance } from 'fastify';
import type { LLMProvider, ChatMessage } from '../providers/types.js';
import { cacheService } from '../services/cache.js';

type AnalyzeRequestBody = {
    text: string;
    sourceLang?: string;
};

type AnalyzeResponse = {
    original: string;
    translated: string;
    reading: string; // Hiragana reading of original
    segments: { surface: string; reading: string }[]; // Furigana segments
};

const systemPrompt = `You are a Japanese language analysis engine.
Process the input text and provide:
1. "translated": Natural, polite translation in the source language (or Chinese if source is Japanese).
2. "reading": The full Hiragana reading of the input text.
3. "segments": Parse the input into segments (bunsetsu). If a segment has Kanji, provide its reading in Hiragana. If no Kanji, reading is entity string.

Return purely JSON:
{
  "translated": "...",
  "reading": "...",
  "segments": [{"surface": "...", "reading": ""}, ...]
}`;

export const registerAnalyze = async (
    app: FastifyInstance,
    provider: LLMProvider
) => {
    app.post<{ Body: AnalyzeRequestBody }>('/api/analyze', async (request, reply) => {
        const { text, sourceLang } = request.body || {};

        if (!text || typeof text !== 'string') {
            return reply.status(400).send({ error: 'text is required' });
        }
        if (text.length > 500) {
            return reply.status(400).send({ error: 'text max length 500' });
        }

        const cacheKey = cacheService.generateKey('analyze', { text, sourceLang });
        const cached = cacheService.get<AnalyzeResponse>(cacheKey);
        if (cached) {
            return cached;
        }

        const messages: ChatMessage[] = [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: `Text: ${text}` }
        ];

        try {
            const llmResult = await provider.generate(messages);
            const content = llmResult.content.trim();
            const jsonStr = content.replace(/^```json\s*/, '').replace(/\s*```$/, '');
            const parsed = JSON.parse(jsonStr);

            const result = {
                original: text,
                translated: parsed.translated,
                reading: parsed.reading,
                segments: parsed.segments
            };

            cacheService.set(cacheKey, result);
            return result;
        } catch (err) {
            request.log.error(err);
            return reply.status(500).send({ error: 'Analysis failed' });
        }
    });
};

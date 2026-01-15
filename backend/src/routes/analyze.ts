
import type { FastifyInstance } from 'fastify';
import type { LLMProvider, ChatMessage } from '../providers/types.js';
import { cacheService } from '../services/cache.js';
import { dictionaryService } from '../services/dictionary.js';

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

const systemPrompt = `You are a translator.
Translate the following Japanese text into natural, polite target language (Traditional Chinese if not specified).
Return ONLY the translation string. Do not include quotes or explanations.`;

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

        try {
            // Parallel execution: LLM for translation, DictionaryService for analysis
            const translationPromise = (async () => {
                const messages: ChatMessage[] = [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: `Text: ${text}` }
                ];
                const llmResult = await provider.generate(messages);
                return llmResult.content.trim();
            })();

            const analysisPromise = dictionaryService.parseSegments(text);
            const readingPromise = dictionaryService.getReading(text);

            const [translated, segments, reading] = await Promise.all([
                translationPromise,
                analysisPromise,
                readingPromise
            ]);

            const result = {
                original: text,
                translated,
                reading,
                segments
            };

            cacheService.set(cacheKey, result);
            return result;
        } catch (err) {
            request.log.error(err);
            return reply.status(500).send({ error: 'Analysis failed' });
        }
    });
};

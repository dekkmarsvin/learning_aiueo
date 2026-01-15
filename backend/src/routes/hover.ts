import type { FastifyInstance } from 'fastify';
import type { LLMProvider, ChatMessage } from '../providers/types.js';
import type { ChatStore } from '../store/chatStore.js';
import { cacheService } from '../services/cache.js';
import { dictionaryService } from '../services/dictionary.js';

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

        if (text.length > 1000) {
            return reply.status(400).send({ error: 'text length must be <= 1000 characters' });
        }

        // 1. Check cache
        const cacheKey = cacheService.generateKey('hover', { text, targetLang });
        const cached = cacheService.get<{ translation: string; cached: boolean }>(cacheKey);
        if (cached) {
            return { ...cached, cached: true };
        }

        // 2. Dictionary Lookup (Optimization)
        // If text is short (likely a word), try Jisho first
        if (text.length <= 10) {
            const wordData = await dictionaryService.lookupWord(text);
            if (wordData) {
                // Extract definition
                // Jisho structure: data[0].senses[0].english_definitions
                // We might want to filter for targetLang, but Jisho is mainly English.
                // If target is 'en', PERFECTION.
                // If target is 'tc', we might still want to use LLM because Jisho is English.
                // BUT, if the user is okay with English definitions or if we are just cutting tokens...
                // The requirements didn't specify target lang handling for dictionary explicitly, but implied "cloud dictionary".
                // Most cloud constant-cost dictionaries are J-E.
                // Let's assume for now if target is EN, we use Jisho.
                // If target is TC, we might fallback to LLM for now to ensure user gets Chinese.

                if (targetLang === 'en') {
                    const meanings = wordData.senses[0]?.english_definitions?.join(', ');
                    if (meanings) {
                        const result = { translation: meanings, cached: false };
                        cacheService.set(cacheKey, result);
                        return result;
                    }
                }
            }
        }

        // 3. Call LLM (Fallback)
        const messages: ChatMessage[] = [
            { role: 'system', content: getSystemPrompt(targetLang) },
            { role: 'user', content: text }
        ];

        try {
            const llmResult = await provider.generate(messages);
            const translation = llmResult.content.trim();

            const result = { translation, cached: false };
            cacheService.set(cacheKey, result);

            return result;
        } catch (err) {
            request.log.error(err);
            return reply.status(500).send({ error: 'Translation failed' });
        }
    });
};

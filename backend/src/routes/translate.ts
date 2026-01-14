import type { FastifyInstance } from 'fastify';
import type { LLMProvider, ChatMessage } from '../providers/types.js';

type TranslateRequestBody = {
    text: string;
    sourceLang?: string;
};

type TranslateResponse = {
    translated: string;
    original: string;
    reading: string;
};

const systemPrompt = `You are a professional translator.
Translate the user's text into natural, polite Japanese.
Also provide the reading (Hiragana) for the translated text.
Return the result as a JSON object with the keys "translated" and "reading".
Example: {"translated": "こんにちは", "reading": "こんにちは"}
Do not include any other text.`;

export const registerTranslate = async (
    app: FastifyInstance,
    provider: LLMProvider
) => {
    app.post<{ Body: TranslateRequestBody }>('/api/translate', async (request, reply) => {
        const { text, sourceLang } = request.body || {};

        if (!text || typeof text !== 'string') {
            return reply.status(400).send({ error: 'text is required' });
        }

        const messages: ChatMessage[] = [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: `Source Language: ${sourceLang || 'Auto'}\nText: ${text}` }
        ];

        try {
            const llmResult = await provider.generate(messages);
            const content = llmResult.content.trim();
            // Handle potential markdown code blocks if the LLM wraps the JSON
            const jsonStr = content.replace(/^```json\s*/, '').replace(/\s*```$/, '');
            const parsed = JSON.parse(jsonStr);

            if (
                !parsed ||
                typeof parsed.translated !== 'string' ||
                typeof parsed.reading !== 'string'
            ) {
                request.log.error({ output: llmResult.content }, 'LLM response invalid');
                return reply.status(502).send({ error: 'LLM response invalid' });
            }

            return {
                original: text,
                translated: parsed.translated,
                reading: parsed.reading
            };
        } catch (err) {
            request.log.error(err);
            return reply.status(500).send({ error: 'Translation failed' });
        }
    });
};

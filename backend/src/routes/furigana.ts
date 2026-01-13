import type { FastifyInstance } from 'fastify';
import type { LLMProvider, ChatMessage } from '../providers/types.js';

type FuriganaRequestBody = {
    text: string;
};

type FuriganaSegment = {
    surface: string;
    reading: string;
};

const systemPrompt = `You are a Japanese text parser.
Your task is to take a Japanese sentence and split it into semantic segments (bunsetsu or words).
For each segment containing Kanji, provide the reading in Hiragana.
For segments without Kanji (Kana only or punctuation), leave the reading empty.

Return a JSON array of objects with keys:
- surface (string): The text segment.
- reading (string): The Hiragana reading IF and ONLY IF the segment has Kanji. Otherwise empty string.

Example Input: 天気はどうですか。
Example Output: [{"surface": "天気", "reading": "てんき"}, {"surface": "は", "reading": ""}, {"surface": "どうですか", "reading": ""}, {"surface": "。", "reading": ""}]

Do not include any extra text.`;

export const registerFurigana = async (
    app: FastifyInstance,
    provider: LLMProvider
) => {
    app.post<{ Body: FuriganaRequestBody }>('/api/furigana', async (request, reply) => {
        const { text } = request.body || {};

        if (!text || typeof text !== 'string') {
            return reply.status(400).send({ error: 'text is required' });
        }

        // Simple optimization: if no kanji, return as is
        if (!/[\u4e00-\u9faf]/.test(text)) {
            return [{ surface: text, reading: '' }];
        }

        const messages: ChatMessage[] = [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: text }
        ];

        try {
            const llmResult = await provider.generate(messages);
            const content = llmResult.content.trim();

            // Robust JSON extraction
            let jsonStr = content;
            const firstOpen = content.indexOf('[');
            const lastClose = content.lastIndexOf(']');
            if (firstOpen !== -1 && lastClose !== -1 && lastClose > firstOpen) {
                jsonStr = content.substring(firstOpen, lastClose + 1);
            }

            // Try parsing
            let parsed: FuriganaSegment[];
            try {
                parsed = JSON.parse(jsonStr);
            } catch {
                // Fallback if not valid JSON
                return [{ surface: text, reading: '' }];
            }

            if (!Array.isArray(parsed)) {
                return [{ surface: text, reading: '' }];
            }

            return parsed;
        } catch (err) {
            request.log.error(err);
            // Fallback on error
            return [{ surface: text, reading: '' }];
        }
    });
};

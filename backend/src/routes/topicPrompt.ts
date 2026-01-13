import type { FastifyInstance } from 'fastify';
import type { LLMProvider } from '../providers/types.js';
import type { ChatStore } from '../store/chatStore.js';

type TopicPromptRequestBody = {
    topic: string;
    context: string;
};

const getSystemPrompt = () => `あなたは日本語会話の練習を支援するアシスタントです。
与えられた話題について、学習者が会話を始めやすい簡潔な一文を提案してください。`;

const getUserPrompt = (topic: string, context: string) => `話題: ${topic}
文脈: ${context}

この話題について、日本語学習者が会話練習を始めるための簡潔な一文を提案してください。
20文字以内で、自然な日本語で書いてください。
一文だけを返してください。説明や追加情報は不要です。`;

export const registerTopicPrompt = async (
    app: FastifyInstance,
    provider: LLMProvider,
    store: ChatStore
) => {
    app.post<{ Body: TopicPromptRequestBody }>('/api/topic-prompt', async (request, reply) => {
        const { topic, context } = request.body || {};

        if (!topic || !context) {
            return reply.status(400).send({ error: 'topic and context are required' });
        }

        // 1. Check cache
        const cached = await store.getCachedTopicPrompt(topic, context);
        if (cached) {
            return { topic, prompt: cached, cached: true };
        }

        // 2. Call LLM
        const messages = [
            { role: 'system' as const, content: getSystemPrompt() },
            { role: 'user' as const, content: getUserPrompt(topic, context) }
        ];

        try {
            const llmResult = await provider.generate(messages);
            const prompt = llmResult.content.trim();

            // 3. Store in cache
            store.setCachedTopicPrompt(topic, context, prompt).catch(err => request.log.error(err));

            return { topic, prompt, cached: false };
        } catch (err) {
            request.log.error(err);
            return reply.status(500).send({ error: 'Failed to generate topic prompt' });
        }
    });
};

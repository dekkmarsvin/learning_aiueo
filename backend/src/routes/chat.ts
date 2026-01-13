import type { FastifyInstance } from 'fastify';
import type { LLMProvider, ChatMessage } from '../providers/types.js';
import type { ChatStore } from '../store/chatStore.js';

type ChatRequestBody = {
	sessionId?: string;
	message?: string;
	topic?: string;
};

type StructuredResponse = {
	reply: string;
	analysis: string;
	suggestions: string[];
	grammarNotes: string[];
};

const systemPrompt = `You are a Japanese tutor and chat partner.
Respond in natural Japanese.
Also analyze the user's Japanese input and provide grammar notes and suggested replies.
Return a single JSON object with keys: reply (string), analysis (string), suggestions (array of strings), grammarNotes (array of strings).
Do not include any extra text outside JSON.`;

const extractJson = (text: string): StructuredResponse | null => {
	try {
		return JSON.parse(text) as StructuredResponse;
	} catch {
		const match = text.match(/\{[\s\S]*\}/);
		if (!match) return null;
		try {
			return JSON.parse(match[0]) as StructuredResponse;
		} catch {
			return null;
		}
	}
};

const normalizeStructured = (value: StructuredResponse | null, fallbackReply: string) => {
	if (!value) {
		return {
			reply: fallbackReply,
			analysis: '',
			suggestions: [],
			grammarNotes: []
		};
	}

	return {
		reply: value.reply || fallbackReply,
		analysis: value.analysis || '',
		suggestions: Array.isArray(value.suggestions) ? value.suggestions : [],
		grammarNotes: Array.isArray(value.grammarNotes) ? value.grammarNotes : []
	};
};

export const registerChat = async (
	app: FastifyInstance,
	provider: LLMProvider,
	store: ChatStore
) => {
	app.post<{ Body: ChatRequestBody }>('/api/chat', async (request, reply) => {
		const { sessionId, message, topic } = request.body || {};

		if (!message || typeof message !== 'string') {
			return reply.status(400).send({ error: 'message is required' });
		}

		let resolvedSessionId = sessionId;
		if (resolvedSessionId) {
			const valid = await store.isValidSession(resolvedSessionId);
			if (!valid) {
				return reply.status(400).send({ error: 'invalid sessionId' });
			}
		} else {
			resolvedSessionId = await store.createSession();
		}

		const chatHistory: ChatMessage[] = await store.getMessages(resolvedSessionId);

		const promptMessages: ChatMessage[] = [
			{ role: 'system', content: systemPrompt },
			...chatHistory,
			{
				role: 'user',
				content: topic ? `Topic: ${topic}\nUser: ${message}` : message
			}
		];

		await store.addUserMessage(resolvedSessionId, message);

		const llmResult = await provider.generate(promptMessages);
		const structured = normalizeStructured(extractJson(llmResult.content), llmResult.content);

		await store.addAssistantMessage(resolvedSessionId, structured);

		return {
			sessionId: resolvedSessionId,
			reply: structured.reply,
			analysis: structured.analysis,
			suggestions: structured.suggestions,
			grammarNotes: structured.grammarNotes
		};
	});
};

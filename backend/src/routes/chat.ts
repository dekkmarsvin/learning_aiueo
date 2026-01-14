import type { FastifyInstance } from 'fastify';
import type { LLMProvider, ChatMessage } from '../providers/types.js';
import type { ChatStore } from '../store/chatStore.js';

type ChatRequestBody = {
	sessionId?: string;
	message?: string;
	topic?: string;
	targetLang?: string;
};

type StructuredResponse = {
	reply: string;
	analysis: string;
	suggestions: { text: string; reading: string }[];
	grammarNotes: string[];
	analysisTranslation?: string;
	grammarNotesTranslation?: string[];
};

const getSystemPrompt = (targetLang: string) => `You are an expert Japanese tutor and conversation partner.
Your goal is to help the user improve their Japanese skills through natural conversation and detailed feedback.
Target Language for explanations: ${targetLang === 'en' ? 'English' : 'Traditional Chinese (繁體中文)'}.

Instructions:
1. Respond to the user's message in natural, appropriate Japanese (Plain or Polite form depending on context).
2. Analyze the user's input for grammar, vocabulary, and naturalness.
3. Provide grammar notes and key points *in Japanese*.
4. ALSO provide a translation of your analysis and grammar notes into the Target Language.
5. Provide 3 suggested replies for the user to continue the conversation.

Return a SINGLE JSON object with the following keys:
- reply (string): Your Japanese response.
- analysis (string): Analysis of user's input in Japanese.
- analysisTranslation (string): Translation of the analysis into ${targetLang === 'en' ? 'English' : 'Traditional Chinese'}.
- suggestions (array): [{ text: string, reading: string }] (reading in Hiragana).
- grammarNotes (array of strings): Key grammar points/corrections in Japanese.
- grammarNotesTranslation (array of strings): Translation of grammar notes into ${targetLang === 'en' ? 'English' : 'Traditional Chinese'}.

Do not include any text outside the JSON object.`;

const extractJson = (text: string): StructuredResponse | null => {
	try {
		// First try parsing as is
		return JSON.parse(text) as StructuredResponse;
	} catch {
		// Try finding the first '{' and last '}'
		const firstOpen = text.indexOf('{');
		const lastClose = text.lastIndexOf('}');
		if (firstOpen !== -1 && lastClose !== -1 && lastClose > firstOpen) {
			try {
				const jsonStr = text.substring(firstOpen, lastClose + 1);
				return JSON.parse(jsonStr) as StructuredResponse;
			} catch {
				return null;
			}
		}
		return null;
	}
};

const coerceStringArray = (value: unknown) =>
	Array.isArray(value) ? value.filter((item) => typeof item === 'string') : [];

const coerceSuggestions = (value: unknown) => {
	if (!Array.isArray(value)) return [];
	return value
		.map((item) => {
			if (!item || typeof item !== 'object') return null;
			const text = (item as { text?: unknown }).text;
			const reading = (item as { reading?: unknown }).reading;
			if (typeof text !== 'string' || typeof reading !== 'string') return null;
			return { text, reading };
		})
		.filter((item): item is { text: string; reading: string } => Boolean(item));
};

const normalizeStructured = (value: StructuredResponse) => ({
	reply: typeof value.reply === 'string' ? value.reply : '',
	analysis: typeof value.analysis === 'string' ? value.analysis : '',
	suggestions: coerceSuggestions(value.suggestions),
	grammarNotes: coerceStringArray(value.grammarNotes),
	analysisTranslation: typeof value.analysisTranslation === 'string' ? value.analysisTranslation : '',
	grammarNotesTranslation: coerceStringArray(value.grammarNotesTranslation)
});

const isStructuredResponse = (value: StructuredResponse) =>
	typeof value.reply === 'string' && typeof value.analysis === 'string';

export const registerChat = async (
	app: FastifyInstance,
	provider: LLMProvider,
	store: ChatStore
) => {
	app.post<{ Body: ChatRequestBody }>('/api/chat', async (request, reply) => {
		const { sessionId, message, topic, targetLang = 'tc' } = request.body || {};

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
			{ role: 'system', content: getSystemPrompt(targetLang) },
			...chatHistory,
			{
				role: 'user',
				content: topic ? `Topic: ${topic}\nUser: ${message}` : message
			}
		];

		await store.addUserMessage(resolvedSessionId, message);

		const llmResult = await provider.generate(promptMessages);
		const parsed = extractJson(llmResult.content);
		if (!parsed || !isStructuredResponse(parsed)) {
			request.log.error({ output: llmResult.content }, 'LLM response invalid');
			return reply.status(502).send({ error: 'LLM response invalid' });
		}

		const structured = normalizeStructured(parsed);

		await store.addAssistantMessage(resolvedSessionId, structured);

		return {
			sessionId: resolvedSessionId,
			reply: structured.reply,
			analysis: structured.analysis,
			suggestions: structured.suggestions,
			grammarNotes: structured.grammarNotes,
			analysisTranslation: structured.analysisTranslation,
			grammarNotesTranslation: structured.grammarNotesTranslation
		};
	});
};

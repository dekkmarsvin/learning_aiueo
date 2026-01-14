import { LLMProvider, ChatMessage } from './types.js';

type GeminiConfig = {
	apiKey: string;
	model: string;
};

type GeminiResponse = {
	candidates?: { content?: { parts?: { text?: string }[] } }[];
};

const buildPrompt = (messages: ChatMessage[]) =>
	messages
		.map((message) => `${message.role.toUpperCase()}: ${message.content}`)
		.join('\n');

export const createGeminiProvider = ({ apiKey, model }: GeminiConfig): LLMProvider => {
	const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

	return {
		async generate(messages: ChatMessage[]) {
			if (!apiKey) {
				throw new Error('GEMINI_API_KEY is required when provider=gemini');
			}

			const prompt = buildPrompt(messages);
			const response = await fetch(url, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'x-goog-api-key': apiKey
				},
				body: JSON.stringify({
					contents: [{ role: 'user', parts: [{ text: prompt }] }],
					generationConfig: { temperature: 0.4 }
				})
			});

			if (!response.ok) {
				const text = await response.text();
				throw new Error(`Gemini request failed: ${response.status} ${text}`);
			}

			const data = (await response.json()) as GeminiResponse;
			const content = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
			if (!content) {
				throw new Error('Gemini response missing content');
			}

			return { content };
		}
	};
};

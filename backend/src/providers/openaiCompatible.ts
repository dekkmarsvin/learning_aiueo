import { LLMProvider, ChatMessage } from './types.js';

type OpenAICompatibleConfig = {
	baseUrl: string;
	apiKey?: string;
	model: string;
};

type OpenAICompatibleResponse = {
	choices?: { message?: { content?: string } }[];
};

export const createOpenAICompatibleProvider = ({
	baseUrl,
	apiKey,
	model
}: OpenAICompatibleConfig): LLMProvider => {
	const url = new URL('/v1/chat/completions', baseUrl).toString();

	return {
		async generate(messages: ChatMessage[]) {
			const response = await fetch(url, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {})
				},
				body: JSON.stringify({
					model,
					messages,
					temperature: 0.4
				})
			});

			if (!response.ok) {
				const text = await response.text();
				throw new Error(`LLM request failed: ${response.status} ${text}`);
			}

			const data = (await response.json()) as OpenAICompatibleResponse;
			const content = data.choices?.[0]?.message?.content?.trim();

			if (!content) {
				throw new Error('LLM response missing content');
			}

			return { content };
		}
	};
};

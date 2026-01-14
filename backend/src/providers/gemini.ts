import { GoogleGenerativeAI } from '@google/generative-ai';
import { LLMProvider, ChatMessage } from './types.js';

type GeminiConfig = {
	apiKey: string;
	model: string;
};

export const createGeminiProvider = ({ apiKey, model }: GeminiConfig): LLMProvider => {
	const genAI = new GoogleGenerativeAI(apiKey);

	return {
		async generate(messages: ChatMessage[]) {
			if (!apiKey) {
				throw new Error('GEMINI_API_KEY is required when provider=gemini');
			}

			const systemMessage = messages.find((m) => m.role === 'system');
			const conversationMessages = messages.filter((m) => m.role !== 'system');

			const modelParams: any = { model: model };
			if (systemMessage) {
				modelParams.systemInstruction = systemMessage.content;
			}

			const genModel = genAI.getGenerativeModel(modelParams);

			const history = conversationMessages.slice(0, -1).map((m) => ({
				role: m.role === 'assistant' ? 'model' : 'user',
				parts: [{ text: m.content }]
			}));

			const lastMessage = conversationMessages[conversationMessages.length - 1];
			if (!lastMessage) {
				throw new Error('No messages provided to generate response');
			}

			const chat = genModel.startChat({
				history,
				generationConfig: {
					temperature: 0.4
				}
			});

			const result = await chat.sendMessage(lastMessage.content);
			const response = result.response;
			const text = response.text();

			return { content: text };
		}
	};
};

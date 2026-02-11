export type ChatMessage = {
	role: 'system' | 'user' | 'assistant';
	content: string;
};

export type LLMResult = {
	content: string;
};

export type GenerateOptions = {
	tools?: {
		googleSearch?: boolean;
		urlContext?: string[];
	};
};

export interface LLMProvider {
	generate(messages: ChatMessage[], options?: GenerateOptions): Promise<LLMResult>;
}

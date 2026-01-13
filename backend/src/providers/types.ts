export type ChatMessage = {
	role: 'system' | 'user' | 'assistant';
	content: string;
};

export type LLMResult = {
	content: string;
};

export interface LLMProvider {
	generate(messages: ChatMessage[]): Promise<LLMResult>;
}

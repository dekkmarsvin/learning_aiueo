export type ChatResponse = {
	sessionId: string;
	reply: string;
	analysis: string;
	suggestions: string[];
	grammarNotes: string[];
};

export type ChatRequest = {
	sessionId?: string | null;
	message: string;
	topic?: string;
};

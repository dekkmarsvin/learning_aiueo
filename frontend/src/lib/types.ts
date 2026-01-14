export type ChatResponse = {
	sessionId: string;
	reply: string;
	analysis: string;
	suggestions: { text: string; reading: string }[];
	grammarNotes: string[];
	analysisTranslation?: string;
	grammarNotesTranslation?: string[];
};

export type Language = 'tc' | 'en';

export type ChatRequest = {
	sessionId?: string | null;
	message: string;
	topic?: string;
	targetLang?: string;
};

export type TranslateRequest = {
	text: string;
	sourceLang?: string;
};

export type TranslateResponse = {
	original: string;
	translated: string;
};

export type FuriganaSegment = {
	surface: string;
	reading: string;
};

export type NewsItem = {
	title: string;
	translatedTitle: string;
	url: string;
	source: string;
	publishedAt: string;
	content?: string;
	translatedContent?: string;
};

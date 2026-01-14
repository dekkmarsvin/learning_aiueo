import type { ChatRequest, ChatResponse, FuriganaSegment } from './types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080';

export const sendMessage = async (payload: ChatRequest): Promise<ChatResponse> => {
	const response = await fetch(`${API_BASE_URL}/api/chat`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(payload)
	});

	if (!response.ok) {
		const text = await response.text();
		throw new Error(text || 'API request failed');
	}

	return (await response.json()) as ChatResponse;
};

export const translateText = async (payload: { text: string; sourceLang?: string }): Promise<{ original: string; translated: string; reading: string }> => {
	const response = await fetch(`${API_BASE_URL}/api/translate`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(payload)
	});

	if (!response.ok) {
		const text = await response.text();
		throw new Error(text || 'Translation failed');
	}

	return (await response.json());
};

export const getFurigana = async (text: string): Promise<FuriganaSegment[]> => {
	const response = await fetch(`${API_BASE_URL}/api/furigana`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ text })
	});

	if (!response.ok) {
		return [{ surface: text, reading: '' }];
	}

	return (await response.json()) as FuriganaSegment[];
};

export const getHoverTranslation = async (text: string, targetLang: string = 'tc'): Promise<string> => {
	const response = await fetch(`${API_BASE_URL}/api/hover`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ text, targetLang })
	});

	if (!response.ok) {
		return '';
	}

	const data = await response.json();
	return data.translation;
};

export const getTopicPrompt = async (topic: string, context: string): Promise<string> => {
	const response = await fetch(`${API_BASE_URL}/api/topic-prompt`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ topic, context })
	});

	if (!response.ok) {
		return topic; // Fallback to keyword
	}

	const data = await response.json();
	return data.prompt;
};

export const getNews = async (): Promise<import('./types').NewsItem[]> => {
	const response = await fetch(`${API_BASE_URL}/api/news`, {
		method: 'GET',
		headers: { 'Content-Type': 'application/json' }
	});

	if (!response.ok) {
		return [];
	}

	const data = await response.json();
	return data.news;
};

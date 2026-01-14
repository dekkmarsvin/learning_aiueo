import type { ChatRequest, ChatResponse, FuriganaSegment } from './types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';
const API_AUTH_TOKEN = import.meta.env.VITE_API_AUTH_TOKEN || '';

const buildHeaders = () => ({
	'Content-Type': 'application/json',
	...(API_AUTH_TOKEN ? { 'x-api-key': API_AUTH_TOKEN } : {})
});

export const sendMessage = async (payload: ChatRequest): Promise<ChatResponse> => {
	const response = await fetch(`${API_BASE_URL}/api/chat`, {
		method: 'POST',
		headers: buildHeaders(),
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
		headers: buildHeaders(),
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
		headers: buildHeaders(),
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
		headers: buildHeaders(),
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
		headers: buildHeaders(),
		body: JSON.stringify({ topic, context })
	});

	if (!response.ok) {
		return topic; // Fallback to keyword
	}

	const data = await response.json();
	return data.prompt;
};

import type { ChatRequest, ChatResponse } from './types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';

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

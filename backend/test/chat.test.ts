import { describe, it, expect } from 'vitest';
import { createApp } from '../src/app.js';
import type { LLMProvider } from '../src/providers/types.js';
import { MemoryChatStore } from '../src/store/chatStore.js';

const mockProvider: LLMProvider = {
	async generate() {
		return {
			content: JSON.stringify({
				reply: 'こんにちは！',
				analysis: '自然な挨拶です。',
				suggestions: ['元気ですか？'],
				grammarNotes: ['「こんにちは」は定番の挨拶']
			})
		};
	}
};

describe('POST /api/chat', () => {
	it('validates missing message', async () => {
		const app = await createApp(mockProvider, new MemoryChatStore());
		const response = await app.inject({
			method: 'POST',
			url: '/api/chat',
			payload: {}
		});

		expect(response.statusCode).toBe(400);
	});

	it('returns structured reply', async () => {
		const app = await createApp(mockProvider, new MemoryChatStore());
		const response = await app.inject({
			method: 'POST',
			url: '/api/chat',
			payload: { message: 'おはよう' }
		});

		expect(response.statusCode).toBe(200);
		const body = response.json();
		expect(body.reply).toBe('こんにちは！');
		expect(body.suggestions).toEqual(['元気ですか？']);
		expect(body.grammarNotes).toEqual(['「こんにちは」は定番の挨拶']);
	});
});

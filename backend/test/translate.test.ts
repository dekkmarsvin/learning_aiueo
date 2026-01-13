import { describe, it, expect } from 'vitest';
import { createApp } from '../src/app.js';
import type { LLMProvider } from '../src/providers/types.js';
import { MemoryChatStore } from '../src/store/chatStore.js';

const mockProvider: LLMProvider = {
    async generate() {
        return {
            content: JSON.stringify({
                translated: 'こんにちは',
                reading: 'こんにちは'
            })
        };
    }
};

describe('POST /api/translate', () => {
    it('validates missing text', async () => {
        const app = await createApp(mockProvider, new MemoryChatStore());
        const response = await app.inject({
            method: 'POST',
            url: '/api/translate',
            payload: {}
        });

        expect(response.statusCode).toBe(400);
    });

    it('returns structured translation with reading', async () => {
        const app = await createApp(mockProvider, new MemoryChatStore());
        const response = await app.inject({
            method: 'POST',
            url: '/api/translate',
            payload: { text: 'Hello', sourceLang: 'English' }
        });

        expect(response.statusCode).toBe(200);
        const body = response.json();
        expect(body.translated).toBe('こんにちは');
        expect(body.reading).toBe('こんにちは');
        expect(body.original).toBe('Hello');
    });
});

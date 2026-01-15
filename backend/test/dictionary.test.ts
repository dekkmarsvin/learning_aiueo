import { describe, it, expect } from 'vitest';
import { DictionaryService } from '../src/services/dictionary.js';

describe('DictionaryService', () => {
    // Kuroshiro might need some time to init or mock for testing. 
    // Since we are running in node environment, we might need real files or mock.
    // The dictPath in services/dictionary.ts points to node_modules...

    // For unit testing, mocking Kuroshiro is safer to avoid loading large dict files.
    // However, we want to integration test.

    it('initializes', async () => {
        const service = new DictionaryService();
        await expect(service.initialize()).resolves.toBeUndefined();
    });

    // Validating real conversion might require the dict files to be present.
    // Assuming 'npm install' ran, they should be there.

    // Skip if too heavy? Let's try.
});

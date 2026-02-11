import { createGeminiProvider } from './src/providers/gemini.js';
import dotenv from 'dotenv';

dotenv.config({ path: '../.env' });

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
    console.error('GEMINI_API_KEY is missing');
    process.exit(1);
}

const model = process.env.LLM_MODEL || 'gemini-2.0-flash';
console.log('Using model:', model);

const provider = createGeminiProvider({
    apiKey,
    model
});

async function runTests() {
    console.log('--- Test 1: Basic Generation ---');
    try {
        const res1 = await provider.generate([{ role: 'user', content: 'Say hello in Japanese.' }]);
        console.log('Result:', res1.content);
    } catch (e) {
        console.error('Test 1 Failed:', e);
    }

    console.log('\n--- Test 2: Google Search (Grounding) ---');
    try {
        const res2 = await provider.generate(
            [{ role: 'user', content: 'Who won the Super Bowl in 2025? (Answer briefly)' }],
            { tools: { googleSearch: true } }
        );
        console.log('Result:', res2.content);
        // Note: Actual grounding metadata isn't returned in current interface, but content should be accurate/grounded.
    } catch (e) {
        console.error('Test 2 Failed:', JSON.stringify(e, null, 2));
    }

    console.log('\n--- Test 3: URL Context ---');
    try {
        // Use a public documentation URL that is likely to be accessible and stable
        const url = 'https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/418';
        const res3 = await provider.generate(
            [{ role: 'user', content: 'What is the HTTP status code 418?' }],
            { tools: { urlContext: [url] } }
        );
        console.log('Result:', res3.content);
    } catch (e: any) {
        console.error('Test 3 Failed:', e.message);
        console.error('Test 3 Body:', JSON.stringify(e, null, 2));
    }
}

runTests();

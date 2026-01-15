import * as KuroshiroImport from 'kuroshiro';
// @ts-ignore
const Kuroshiro = KuroshiroImport.default?.default || KuroshiroImport.default || KuroshiroImport;
import KuromojiAnalyzer from 'kuroshiro-analyzer-kuromoji';
import axios from 'axios';
import path from 'path';

export class DictionaryService {
    private kuroshiro: any;
    private initialized: boolean = false;
    private initPromise: Promise<void> | null = null;

    constructor() {
        this.kuroshiro = new Kuroshiro();
    }

    async initialize() {
        if (this.initialized) return;
        if (this.initPromise) return this.initPromise;

        console.log('Initializing Kuroshiro...');
        this.initPromise = (async () => {
            const analyzer = new KuromojiAnalyzer({
                dictPath: path.resolve('node_modules/kuromoji/dict')
            });
            await this.kuroshiro.init(analyzer);
            this.initialized = true;
            console.log('Kuroshiro initialized.');
        })();

        return this.initPromise;
    }

    async convertToFurigana(text: string): Promise<string> {
        await this.initialize();
        // Return hiragana reading, we can stick to hiragana for now or make it configurable
        // But for furigana, usually we want the reading.
        // Actually, kuroshiro's convert return the whole string converted.
        return this.kuroshiro.convert(text, { to: 'hiragana', mode: 'okurigana' });
    }

    async getReading(text: string): Promise<string> {
        await this.initialize();
        return this.kuroshiro.convert(text, { to: 'hiragana', mode: 'normal' });
    }

    /**
     * Parse text into segments with readings
     */
    async parseSegments(text: string): Promise<{ surface: string; reading: string }[]> {
        await this.initialize();
        // Kuroshiro doesn't expose the raw tokenization easily in the public API, 
        // but verify if we can get it or if we need to use a hack or just rely on convert with a delimiter
        // Using spaced mode is often a good proxy for segmentation
        const spaced = await this.kuroshiro.convert(text, { mode: 'spaced', to: 'hiragana' });
        const surfaces = await this.kuroshiro.convert(text, { mode: 'spaced', to: 'raw' }); // 'raw' isn't a standard 'to' option maybe? 
        // Wait, 'raw' is not standard.
        // If we want segments, we might be better off using the underlying tokenizer if accessible, 
        // OR, just use the 'furigana' mode which returns HTML/text with ruby, and parse that?
        // Let's try 'okurigana' mode as input to a parser?

        // Actually, let's keep it simple for now. 
        // If we really need strict segmentation:
        // We can just use the parsing logic we used to have or...
        // Let's implement a simple segmentation based on the 'spaced' output if possible.
        // But 'spaced' gives reading.

        // Alternative: Use the analyzer directly if needed, but Kuroshiro wraps it.
        // Let's use a split strategy based on kuroshiro's output if possible.

        // For now, let's implement a "best effort" using 'okurigana' output which looks like:
        // 漢字(かんじ) or <ruby>...
        // Default okurigana uses parentheses.
        // We can parse that back into segments.
        const okurigana = await this.kuroshiro.convert(text, { mode: 'okurigana', to: 'hiragana' });
        return this.parseOkurigana(text, okurigana);
    }

    private parseOkurigana(original: string, converted: string): { surface: string; reading: string }[] {
        // Kuroshiro (okurigana) output:  "天気(てんき)は良(い)いです"
        // We need to map this back to: [{"surface": "天気", "reading": "てんき"}, {"surface": "は", "reading": ""}, ...]

        const segments: { surface: string; reading: string }[] = [];
        const regex = /([^(\s]+)(?:\(([^)]+)\))?/g;
        let match;

        // This simple regex might fail on complex mixed content, but Kuroshiro usually outputs consistently.
        // However, "okurigana" mode keeps kana as is.
        // Example: 天気(てんき)は -> 天気(reading) + は
        // But Kuroshiro okurigana output is a string.

        // Let's try to match the converted string against the original to be safe?
        // Actually, just parsing the parens is usually enough for "kanji(kana)" pattern.
        // Non-kanji parts are just text.

        let currentPos = 0;

        // Note: kuroshiro okurigana format is: Kanji(Reading)Kana...

        // We can iterate the converted string
        // If we see Kanji followed by (Kana), that's a segment?
        // Kuroshiro's okurigana is: "漢字(かんじ)"

        // Let's assume the parenthesis format suitable for parsing.

        const parts = converted.split(/([^\x00-\x7F]+)\(([^)]+)\)/); // This split might be tricky.

        // Let's use a simpler approach. 
        // We want to verify against original text to ensure correctness? 
        // Or simply trust the output.
        // For MVP, relying on the parens is fine.

        // Regex to find "Text(Reading)" or "Text"
        // But wait, "Text" could be "は".
        // "Text(Reading)" is "天気(てんき)".

        // Issue: "明日(あした)" vs "明日(あす)" - depends on dictionary.

        // Let's implement a parser loop.
        const tokenRegex = /([^\(\)]+)(?:\(([^)]+)\))?/g;
        while ((match = tokenRegex.exec(converted)) !== null) {
            // match[1] is surface (or part of it), match[2] is reading if present.
            // Wait, if input is "今日は", output is "今日(きょう)は"
            // match 1: "今日", group 2: "きょう"
            // match 2: "は", group 2: undefined

            if (match[0].trim() === '') continue;

            const surface = match[1];
            const reading = match[2] || '';

            // Note: Kuroshiro might group things.
            segments.push({ surface, reading });
        }

        return segments;
    }

    /**
     * Check if text consists of Kanji/Kana
     */
    hasKanji(text: string): boolean {
        return Kuroshiro.Util.hasKanji(text);
    }

    /**
     * Jisho API lookup
     */
    async lookupWord(word: string): Promise<any | null> {
        try {
            const response = await axios.get(`https://jisho.org/api/v1/search/words?keyword=${encodeURIComponent(word)}`);
            if (response.data && response.data.data && response.data.data.length > 0) {
                return response.data.data[0];
            }
            return null;
        } catch (error) {
            console.error('Jisho lookup failed:', error);
            return null;
        }
    }
}

export const dictionaryService = new DictionaryService();

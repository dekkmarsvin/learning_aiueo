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
        console.log('Dict Path:', path.resolve('node_modules/kuromoji/dict'));
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
        // Kuroshiro doesn't expose the raw tokenization easily in the public API
        // For now, let's implement a "best effort" using 'okurigana' output which looks like:
        // 漢字(かんじ) or <ruby>...
        // Default okurigana uses parentheses.
        // We can parse that back into segments.
        const okurigana = await this.kuroshiro.convert(text, { mode: 'okurigana', to: 'hiragana' });
        return this.parseOkurigana(text, okurigana);
    }

    private parseOkurigana(original: string, converted: string): { surface: string; reading: string }[] {
        const segments: { surface: string; reading: string }[] = [];

        // Regex to find "Text(Reading)" pattern. 
        // We look for "(Reading)" blocks and assume they apply to the *end* of the preceding text.
        const readingRegex = /\(([^)]+)\)/g;
        let match;
        let lastIndex = 0;

        while ((match = readingRegex.exec(converted)) !== null) {
            const readingBlockStart = match.index;
            const readingBlockEnd = match.index + match[0].length;
            const reading = match[1]; // content inside parens

            // Text between previous match and this reading block
            // This contains the "Plain Text" prefix + "Surface" for this reading
            const precedingText = converted.substring(lastIndex, readingBlockStart);

            if (!precedingText) {
                // Should not happen for valid okurigana unless it starts with parens?
                lastIndex = readingBlockEnd;
                continue;
            }

            // Strategy: The "Surface" for this reading is the suffix of precedingText 
            // that consists of Non-Hiragana/Non-Punctuation characters (heuristic).
            // Usually it's Kanji [Kanji]+, but could handle numbers etc.
            // Split point is after the LAST character that IS Hiragana/Punctuation/Space.

            // Regex for characters that BREAK a surface (Hiragana, Punctuation, Whitespace)
            // \u3040-\u309f: Hiragana
            // \u3000-\u303f: CJK Symbols and Punctuation (includes 、 。 space)
            // \s: Whitespace
            // We iterate backwards or find the last index of such char.

            let splitIndex = -1;
            const separatorRegex = /[\u3040-\u309f\u3000-\u303f\s]/;

            for (let i = precedingText.length - 1; i >= 0; i--) {
                if (separatorRegex.test(precedingText[i])) {
                    splitIndex = i;
                    break;
                }
            }

            const plainPart = precedingText.substring(0, splitIndex + 1);
            const surfacePart = precedingText.substring(splitIndex + 1);

            if (plainPart) {
                segments.push({ surface: plainPart, reading: '' });
            }
            if (surfacePart) {
                segments.push({ surface: surfacePart, reading: reading });
            }

            lastIndex = readingBlockEnd;
        }

        // Add remaining text after last match
        if (lastIndex < converted.length) {
            const remaining = converted.substring(lastIndex);
            segments.push({ surface: remaining, reading: '' });
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

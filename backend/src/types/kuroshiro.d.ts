declare module 'kuroshiro' {
    export default class Kuroshiro {
        constructor();
        init(analyzer: any): Promise<void>;
        convert(text: string, options?: { to?: string; mode?: string; romajiSystem?: string; delimiter_start?: string; delimiter_end?: string }): Promise<string>;
        static Util: {
            isHiragana(text: string): boolean;
            isKatakana(text: string): boolean;
            isKana(text: string): boolean;
            isKanji(text: string): boolean;
            isJapanese(text: string): boolean;
            hasHiragana(text: string): boolean;
            hasKatakana(text: string): boolean;
            hasKana(text: string): boolean;
            hasKanji(text: string): boolean;
            hasJapanese(text: string): boolean;
        };
    }
}

declare module 'kuroshiro-analyzer-kuromoji' {
    export default class KuromojiAnalyzer {
        constructor(options?: { dictPath?: string });
    }
}

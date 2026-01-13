import { toKana, toHiragana, toKatakana } from 'wanakana';

export const generateKanaCandidates = (input: string): string[] => {
	const trimmed = input.trim();
	if (!trimmed) return [];

	const candidates = [
		toKana(trimmed, { IMEMode: true }),
		toHiragana(trimmed),
		toKatakana(trimmed)
	].filter(Boolean);

	return Array.from(new Set(candidates));
};


import * as KuroshiroImport from 'kuroshiro';
// @ts-ignore
const Kuroshiro = KuroshiroImport.default?.default || KuroshiroImport.default || KuroshiroImport;
import KuromojiAnalyzer from 'kuroshiro-analyzer-kuromoji';
import path from 'path';

async function run() {
    const kuroshiro = new Kuroshiro();
    const analyzer = new KuromojiAnalyzer({
        dictPath: path.resolve('node_modules/kuromoji/dict')
    });
    await kuroshiro.init(analyzer);

    const text = '最近、日本でも刃物を使った事件が増えているようで心配です。';
    console.log('Input:', text);

    const okurigana = await kuroshiro.convert(text, { mode: 'okurigana', to: 'hiragana' });
    console.log('Okurigana Output:', okurigana);

    // Parse Logic Simulation
    const regex = /([^(\s]+)(?:\(([^)]+)\))?/g;
    let match;
    console.log('Parsed Segments:');
    while ((match = regex.exec(okurigana)) !== null) {
        if (match[0].trim() === '') continue;
        console.log(`Surface: "${match[1]}", Reading: "${match[2] || ''}"`);
    }
}

run();

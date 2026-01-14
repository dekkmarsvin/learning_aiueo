import axios from 'axios';
import * as cheerio from 'cheerio';
import cron from 'node-cron';
import { LLMProvider } from '../providers/types.js';
import { NewsStore } from '../store/newsStore.js';

export class NewsScraper {
    private provider: LLMProvider;
    private store: NewsStore;
    private targetLang: string;

    constructor(provider: LLMProvider, store: NewsStore, targetLang: string = 'Traditional Chinese') {
        this.provider = provider;
        this.store = store;
        this.targetLang = targetLang;
    }

    async fetchTopNews() {
        try {
            console.log('Fetching Yahoo Japan News Top Picks...');
            const response = await axios.get('https://news.yahoo.co.jp/topics/top-picks');
            const $ = cheerio.load(response.data);

            const newsItems: { title: string; url: string; source: string }[] = [];

            // Yahoo News Topics structure
            // Finding links that point to /pickup/ (most robust way)
            $('a[href*="/pickup/"]').each((_, element) => {
                const link = $(element);
                const url = link.attr('href');

                // Clone to avoid modifying original
                const clone = link.clone();

                // Remove time elements and other metadata that might be present
                clone.find('time').remove();
                clone.find('div[class*="newsFeed_item_media"]').remove();

                // Usually the title is in the first div or just text
                let title = clone.text().trim();

                const source = 'Yahoo News';

                if (title && url && !newsItems.some(n => n.url === url)) {
                    newsItems.push({
                        title,
                        url: url || '',
                        source
                    });
                }
            });

            // Limit to 15
            const top15 = newsItems.slice(0, 15);

            if (top15.length === 0) {
                console.warn('No news items found. Check selectors.');
                return;
            }

            console.log(`Found ${top15.length} items. Fetching content and translating...`);

            // Fetch content for each item
            const itemsWithContent: typeof top15 & { content?: string }[] = [];

            for (const item of top15) {
                try {
                    // Slight delay to be polite
                    await new Promise(resolve => setTimeout(resolve, 500));
                    const content = await this.fetchArticleContent(item.url);
                    itemsWithContent.push({ ...item, content });
                } catch (e) {
                    console.error(`Failed to fetch content for ${item.url}`, e);
                    itemsWithContent.push(item);
                }
            }

            const translated = await this.translateTitles(itemsWithContent);

            const now = new Date();
            const toSave = translated.map(item => ({
                ...item,
                publishedAt: now.toISOString(),
                scrapedAt: now
            }));

            await this.store.saveDailyNews(toSave);
            console.log('News saved successfully.');

        } catch (error) {
            console.error('Error fetching news:', error);
        }
    }

    private async fetchArticleContent(url: string): Promise<string> {
        try {
            const response = await axios.get(url);
            const $ = cheerio.load(response.data);

            // Try to find summary
            let content = $('.highLightSearchTarget').text().trim();

            // Fallback: Check for meta description if specific class not found
            if (!content) {
                content = $('meta[name="description"]').attr('content') || '';
            }

            return content;
        } catch (error) {
            console.error(`Error fetching article content: ${url}`, error);
            return '';
        }
    }

    private async translateTitles(items: { title: string; url: string; source: string; content?: string }[]) {
        const titles = items.map(i => i.title).join('\n');
        const prompt = `Translate the following Japanese news headlines to ${this.targetLang}.
Return ONLY a JSON array of strings, where each string is the translation corresponding to the input line.
Do not include any other text.

Headlines:
${titles}`;

        const response = await this.provider.generate([
            { role: 'user', content: prompt }
        ]);

        let translations: string[] = [];
        try {
            const clean = response.content.replace(/```json/g, '').replace(/```/g, '').trim();
            translations = JSON.parse(clean);
        } catch (e) {
            console.error('Failed to parse translations:', e);
            // Fallback
            translations = items.map(() => '');
        }

        return items.map((item, index) => ({
            ...item,
            translatedTitle: translations[index] || '',
            content: item.content
        }));
    }

    scheduleScraping() {
        // Run every day at 6:00 AM
        cron.schedule('0 6 * * *', () => {
            this.fetchTopNews();
        });
        console.log('News scraper scheduled for daily execution at 06:00.');
    }
}

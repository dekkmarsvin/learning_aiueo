import { ObjectId } from 'mongodb';
import { getDb } from '../db.js';

export interface NewsItem {
    title: string;
    translatedTitle: string;
    url: string;
    source: string;
    content?: string;
    translatedContent?: string;
    publishedAt: string; // ISO string
    scrapedAt: Date;
}

export interface NewsStore {
    saveDailyNews(news: NewsItem[]): Promise<void>;
    getLatestNews(limit?: number): Promise<NewsItem[]>;
    hasNewsForToday(): Promise<boolean>;
}

export class MongoNewsStore implements NewsStore {
    async saveDailyNews(news: NewsItem[]) {
        const db = await getDb();
        const collection = db.collection('news');

        // Optional: Clear old news from today if re-running, or just append/upsert
        // Strategy: Check if we have news for today? 
        // Simpler: Just insert. The query will pick the latest by scrapedAt.
        // Detailed: If we run multiple times a day, we might have duplicates.
        // Better: Insert all, getLatestNews sorts by scrapedAt desc.

        if (news.length === 0) return;

        const operations = news.map(item => ({
            updateOne: {
                filter: { url: item.url },
                update: { $set: item, $setOnInsert: { createdAt: new Date() } },
                upsert: true
            }
        }));

        await collection.bulkWrite(operations);
    }

    async getLatestNews(limit: number = 15): Promise<NewsItem[]> {
        const db = await getDb();
        const collection = db.collection('news');

        // Get items scraped most recently (today's batch)
        // We can sort by scrapedAt desc
        const items = await collection
            .find({})
            .sort({ scrapedAt: -1 }) // Latest batch first
            .limit(limit)
            .toArray();

        // If we mix batches, it's fine. The UI just wants "latest news".
        // Ideally we want the top 15 distinctive items currently relevant.
        // If we sort by scrapedAt, we get the last successful scrape.

        return items.map(item => ({
            title: item.title,
            translatedTitle: item.translatedTitle,
            url: item.url,
            source: item.source,
            content: item.content,
            translatedContent: item.translatedContent,
            publishedAt: item.publishedAt,
            scrapedAt: item.scrapedAt
        }));
    }

    async hasNewsForToday(): Promise<boolean> {
        const db = await getDb();
        const collection = db.collection('news');

        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);

        const count = await collection.countDocuments({
            scrapedAt: { $gte: startOfDay }
        });

        return count > 0;
    }
}

import type { FastifyInstance } from 'fastify';
import type { NewsStore } from '../store/newsStore.js';

export const registerNews = async (
    app: FastifyInstance,
    store: NewsStore
) => {
    app.get('/api/news', async (request, reply) => {
        try {
            // Get latest 15 news items
            const news = await store.getLatestNews(15);
            return { news };
        } catch (error) {
            request.log.error(error);
            return reply.status(500).send({ error: 'Failed to fetch news' });
        }
    });
};

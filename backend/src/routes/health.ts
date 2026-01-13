import type { FastifyInstance } from 'fastify';

export const registerHealth = async (app: FastifyInstance) => {
	app.get('/api/health', async () => ({ status: 'ok' }));
};

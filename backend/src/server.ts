import rateLimit from '@fastify/rate-limit';
import { config } from './config.js';
import { createProvider } from './providers/index.js';
import { createApp } from './app.js';
import { MongoChatStore } from './store/chatStore.js';

const provider = createProvider();
const store = new MongoChatStore();
const app = await createApp(provider, store);

await app.register(rateLimit, {
    max: 100, // 100 requests
    timeWindow: '1 minute' // per minute
});

app.listen({ port: config.port, host: '0.0.0.0' });

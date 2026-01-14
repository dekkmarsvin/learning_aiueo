import { LRUCache } from 'lru-cache';

class CacheService {
    private cache: LRUCache<string, any>;

    constructor() {
        this.cache = new LRUCache<string, any>({
            max: 500, // Max 500 items
            ttl: 1000 * 60 * 60 * 24 // 24 hours TTL
        });
    }

    get<T>(key: string): T | undefined {
        return this.cache.get(key) as T;
    }

    set(key: string, value: any): void {
        this.cache.set(key, value);
    }

    generateKey(prefix: string, data: any): string {
        return `${prefix}:${JSON.stringify(data)}`;
    }
}

export const cacheService = new CacheService();

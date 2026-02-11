import { logger } from './logger';

/**
 * Generic in-memory TTL cache with LRU eviction.
 *
 * Features:
 * - Configurable TTL per instance
 * - Max size with LRU eviction (least recently used entries are removed first)
 * - Stale-while-revalidate: returns stale data on error if available
 * - Stats logging (hits, misses, evictions)
 * - Periodic cleanup of expired entries
 */

interface CacheEntry<T> {
    data: T;
    createdAt: number;
    lastAccessedAt: number;
}

interface TtlCacheOptions {
    /** Cache name (for logging) */
    name: string;
    /** Time-to-live in milliseconds */
    ttlMs: number;
    /** Maximum number of entries before LRU eviction */
    maxSize: number;
    /** Log stats every N operations (0 = disabled) */
    statsInterval?: number;
}

export class TtlCache<T> {
    private cache = new Map<string, CacheEntry<T>>();
    private readonly name: string;
    private readonly ttlMs: number;
    private readonly maxSize: number;
    private readonly statsInterval: number;

    // Stats
    private hits = 0;
    private misses = 0;
    private evictions = 0;
    private opCount = 0;

    // Cleanup timer
    private cleanupTimer: ReturnType<typeof setInterval> | null = null;

    constructor(options: TtlCacheOptions) {
        this.name = options.name;
        this.ttlMs = options.ttlMs;
        this.maxSize = options.maxSize;
        this.statsInterval = options.statsInterval ?? 50;

        // Periodic cleanup every 5 minutes
        this.cleanupTimer = setInterval(() => this.cleanup(), 5 * 60 * 1000);

        logger.info(`Cache "${this.name}" initialized`, {
            ttlMs: this.ttlMs,
            maxSize: this.maxSize,
        });
    }

    /**
     * Get a value from the cache.
     * Returns undefined if not found or expired.
     */
    get(key: string): T | undefined {
        const entry = this.cache.get(key);

        if (!entry) {
            this.misses++;
            this.maybeLogStats();
            return undefined;
        }

        const age = Date.now() - entry.createdAt;

        if (age > this.ttlMs) {
            // Expired — remove it
            this.cache.delete(key);
            this.misses++;
            this.maybeLogStats();
            return undefined;
        }

        // Cache hit — update access time for LRU
        entry.lastAccessedAt = Date.now();
        this.hits++;
        this.maybeLogStats();

        return entry.data;
    }

    /**
     * Get a value even if it's expired (stale).
     * Useful for fallback on API errors.
     */
    getStale(key: string): T | undefined {
        const entry = this.cache.get(key);
        return entry?.data;
    }

    /**
     * Set a value in the cache.
     * If the cache is full, evicts the least recently used entry.
     */
    set(key: string, data: T): void {
        // Evict LRU if at max size
        if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
            this.evictLru();
        }

        const now = Date.now();
        this.cache.set(key, {
            data,
            createdAt: now,
            lastAccessedAt: now,
        });
    }

    /**
     * Check if a key exists and is not expired.
     */
    has(key: string): boolean {
        const entry = this.cache.get(key);
        if (!entry) return false;
        return Date.now() - entry.createdAt <= this.ttlMs;
    }

    /**
     * Delete a specific key.
     */
    delete(key: string): boolean {
        return this.cache.delete(key);
    }

    /**
     * Clear the entire cache.
     */
    clear(): void {
        this.cache.clear();
        logger.debug(`Cache "${this.name}" cleared`);
    }

    /**
     * Get current cache size.
     */
    get size(): number {
        return this.cache.size;
    }

    /**
     * Get cache statistics.
     */
    getStats() {
        const total = this.hits + this.misses;
        return {
            name: this.name,
            size: this.cache.size,
            maxSize: this.maxSize,
            hits: this.hits,
            misses: this.misses,
            evictions: this.evictions,
            hitRate: total > 0 ? ((this.hits / total) * 100).toFixed(1) + '%' : 'N/A',
            ttlMs: this.ttlMs,
        };
    }

    /**
     * Destroy the cache (clears timer).
     */
    destroy(): void {
        if (this.cleanupTimer) {
            clearInterval(this.cleanupTimer);
            this.cleanupTimer = null;
        }
        this.cache.clear();
    }

    // -----------------------------------------------------------------------
    // Private
    // -----------------------------------------------------------------------

    private evictLru(): void {
        let oldestKey: string | null = null;
        let oldestAccess = Infinity;

        for (const [key, entry] of this.cache) {
            if (entry.lastAccessedAt < oldestAccess) {
                oldestAccess = entry.lastAccessedAt;
                oldestKey = key;
            }
        }

        if (oldestKey) {
            this.cache.delete(oldestKey);
            this.evictions++;
        }
    }

    private cleanup(): void {
        const now = Date.now();
        let removed = 0;

        for (const [key, entry] of this.cache) {
            if (now - entry.createdAt > this.ttlMs) {
                this.cache.delete(key);
                removed++;
            }
        }

        if (removed > 0) {
            logger.debug(`Cache "${this.name}" cleanup: removed ${removed} expired entries, ${this.cache.size} remaining`);
        }
    }

    private maybeLogStats(): void {
        this.opCount++;
        if (this.statsInterval > 0 && this.opCount % this.statsInterval === 0) {
            logger.info(`Cache "${this.name}" stats`, this.getStats());
        }
    }
}

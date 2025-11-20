/**
 * Async Validation Cache
 *
 * High-performance in-memory cache for async validation results
 */

interface CacheEntry<T = unknown> {
	readonly result: T;
	readonly timestamp: number;
	readonly ttl: number;
}

interface CacheStats {
	readonly size: number;
	readonly hits: number;
	readonly misses: number;
	readonly evictions: number;
}

/**
 * High-performance in-memory cache for async validation results
 */
class AsyncValidationCache {
	private readonly cache = new Map<string, CacheEntry>();
	private readonly stats = { hits: 0, misses: 0, evictions: 0 };
	private readonly defaultTTL = 5 * 60 * 1000;
	private readonly maxSize = 1000;

	/**
	 * Generates cache key from validation parameters
	 */
	private generateCacheKey(url: string, payload: Record<string, unknown>): string {
		const sortedKeys = Object.keys(payload).sort();
		const normalizedPayload = sortedKeys.reduce(
			(acc, key) => {
				acc[key] = payload[key];
				return acc;
			},
			{} as Record<string, unknown>,
		);

		return `${url}:${JSON.stringify(normalizedPayload)}`;
	}

	/**
	 * Evicts expired entries and enforces size limits
	 */
	private evictStale(): void {
		const now = Date.now();
		let evicted = 0;

		for (const [key, entry] of this.cache.entries()) {
			if (now - entry.timestamp > entry.ttl) {
				this.cache.delete(key);
				evicted++;
			}
		}

		this.stats.evictions += evicted;

		if (this.cache.size > this.maxSize) {
			const excess = this.cache.size - this.maxSize;
			const keys = Array.from(this.cache.keys());

			for (let i = 0; i < excess; i++) {
				this.cache.delete(keys[i]);
				this.stats.evictions++;
			}
		}
	}

	get(url: string, payload: Record<string, unknown>): unknown | null {
		const key = this.generateCacheKey(url, payload);
		const entry = this.cache.get(key);

		if (!entry) {
			this.stats.misses++;
			return null;
		}

		const now = Date.now();
		if (now - entry.timestamp > entry.ttl) {
			this.cache.delete(key);
			this.stats.misses++;
			this.stats.evictions++;
			return null;
		}

		this.stats.hits++;
		return entry.result;
	}

	set(url: string, payload: Record<string, unknown>, result: unknown, customTTL?: number): void {
		this.evictStale();

		const key = this.generateCacheKey(url, payload);
		const entry: CacheEntry = {
			result,
			timestamp: Date.now(),
			ttl: customTTL || this.defaultTTL,
		};

		this.cache.set(key, entry);
	}

	clear(): void {
		this.cache.clear();
		this.stats.hits = 0;
		this.stats.misses = 0;
		this.stats.evictions = 0;
	}

	cleanup(): void {
		this.evictStale();
	}

	getStats(): CacheStats {
		return {
			size: this.cache.size,
			hits: this.stats.hits,
			misses: this.stats.misses,
			evictions: this.stats.evictions,
		};
	}
}

/**
 * Global cache instance for async validation
 */
export const asyncValidationCache = new AsyncValidationCache();

/**
 * Periodic cleanup to prevent memory leaks
 */
setInterval(
	() => {
		asyncValidationCache.cleanup();
	},
	10 * 60 * 1000,
);

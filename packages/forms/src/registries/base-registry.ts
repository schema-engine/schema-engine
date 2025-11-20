import { logger } from '@/lib/logger';
import type { BaseRegistration } from '@/types';

/**
 * Base Registry - Abstract class for all registries
 *
 * Provides common registration, retrieval, and management functionality.
 * Each registry extends this to add type-specific behavior.
 *
 * All registrations must extend BaseRegistration which provides the unified 'id' field.
 *
 * @template TKey - The key type (typically string)
 * @template TValue - The value type (registration object extending BaseRegistration)
 */
export abstract class BaseRegistry<TKey extends string, TValue extends BaseRegistration> {
	protected items = new Map<TKey, TValue>();

	/**
	 * Get the registry name for logging purposes.
	 */
	abstract get registryName(): string;

	/**
	 * Extract the key from an item.
	 * Uses the unified '$type' field from BaseRegistration.
	 * @param item - The item to extract the key from
	 */
	protected getItemKey(item: TValue): TKey {
		return item.$type as TKey;
	}

	/**
	 * Extract the name from an item for logging.
	 * Uses the 'name' field from metadata.
	 * @param item - The item to extract the name from
	 */
	protected getItemName(item: TValue): string {
		return item.metadata.name;
	}

	/**
	 * Register an item.
	 *
	 * @param item - The item to register
	 */
	register(item: TValue): void {
		const key = this.getItemKey(item);
		const name = this.getItemName(item);

		if (this.items.has(key)) {
			const existing = this.items.get(key);
			const existingName = existing ? this.getItemName(existing) : 'unknown';
			logger.warn(`Overriding ${this.registryName}: ${key}`, {
				previousName: existingName,
				newName: name,
			});
		}

		this.items.set(key, item);
		logger.debug(`Registered ${this.registryName}: ${key}`, {
			name,
		});
	}

	/**
	 * Check if an item is registered.
	 *
	 * @param key - The key to check
	 * @returns True if the item is registered
	 */
	has(key: TKey): boolean {
		return this.items.has(key);
	}

	/**
	 * Get a registered item.
	 *
	 * @param key - The key to retrieve
	 * @returns The item or undefined if not found
	 */
	get(key: TKey): TValue | undefined {
		return this.items.get(key);
	}

	/**
	 * Get all registered items.
	 *
	 * @returns Array of all registered items
	 */
	getAll(): TValue[] {
		return Array.from(this.items.values());
	}

	/**
	 * Get all registered keys.
	 *
	 * @returns Array of all registered keys
	 */
	getAllKeys(): TKey[] {
		return Array.from(this.items.keys());
	}

	/**
	 * Get the number of registered items.
	 *
	 * @returns The number of items in the registry
	 */
	get size(): number {
		return this.items.size;
	}

	/**
	 * Clear all registered items. Primarily for testing.
	 */
	clear(): void {
		this.items.clear();
		logger.debug(`${this.registryName} cleared`);
	}

	/**
	 * Get the internal Map for direct access (e.g., for FormEngine).
	 * Use sparingly - prefer the public API methods.
	 *
	 * @internal
	 */
	getMap(): Map<TKey, TValue> {
		return this.items;
	}
}

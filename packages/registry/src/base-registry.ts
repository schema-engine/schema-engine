import { Logger } from '@ecopages/logger';
import type { ReadOnlyRegistry } from './create-registry.js';
import type { BaseRegistration } from './types.js';

const logger = new Logger('[@schema-engine/registry]');

/**
 * Base Registry - Abstract class for all registries
 *
 * Provides common registration, retrieval, and management functionality.
 * Each registry extends this to add type-specific behavior.
 *
 * All registrations must extend BaseRegistration which provides the unified `$type` field.
 *
 * @template TValue - The value type (registration object extending BaseRegistration)
 *
 * @remarks
 * Implements {@link ReadOnlyRegistry}, so the read side (`get`, `has`, `all`, `keys`, `size`, `kind`) is the same as
 * that of a {@link createRegistry} result, and either kind goes wherever a registry is read.
 */
export abstract class BaseRegistry<TValue extends BaseRegistration> implements ReadOnlyRegistry<TValue> {
	protected items = new Map<string, TValue>();

	/** Label used in log messages, for example `Plugin`. */
	abstract readonly kind: string;

	/**
	 * Extract the key from an item.
	 * Uses the unified `$type` field from BaseRegistration.
	 * @param item - The item to extract the key from
	 */
	protected getItemKey(item: TValue): string {
		return item.$type;
	}

	/**
	 * Extract the name from an item for logging.
	 * Uses the `name` field from metadata.
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
			logger.warn(`Overriding ${this.kind}: ${key}`, {
				previousName: existingName,
				newName: name,
			});
		}

		this.items.set(key, item);
		logger.debug(`Registered ${this.kind}: ${key}`, {
			name,
		});
	}

	/**
	 * Check if an item is registered.
	 *
	 * @param key - The key to check
	 * @returns True if the item is registered
	 */
	has(key: string): boolean {
		return this.items.has(key);
	}

	/**
	 * Get a registered item.
	 *
	 * @param key - The key to retrieve
	 * @returns The item or undefined if not found
	 */
	get(key: string): TValue | undefined {
		return this.items.get(key);
	}

	/**
	 * Get all registered items.
	 *
	 * @returns A frozen array of the items, in first-registration order
	 */
	all(): readonly TValue[] {
		return Object.freeze([...this.items.values()]);
	}

	/**
	 * Get all registered keys.
	 *
	 * @returns A frozen array of the keys, in first-registration order
	 */
	keys(): readonly string[] {
		return Object.freeze([...this.items.keys()]);
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
		logger.debug(`${this.kind} cleared`);
	}
}

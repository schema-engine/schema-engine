import type { StandardSchemaV1 } from '@standard-schema/spec';
import type { BaseRegistration } from './types.js';

/**
 * A registry built once from a list of registrations. It has no `register` or
 * `clear`; to change its contents, build another registry from a new list.
 */
export interface ReadOnlyRegistry<TRegistration extends BaseRegistration = BaseRegistration> {
	/** Label used in build errors, for example `Element`. */
	readonly kind: string;
	/** Number of distinct `$type` keys. */
	readonly size: number;
	get(key: string): TRegistration | undefined;
	has(key: string): boolean;
	/** Registrations in first-registration order. The array is frozen. */
	all(): readonly TRegistration[];
	/** `$type` keys in first-registration order. The array is frozen. */
	keys(): readonly string[];
}

/**
 * Require a registration schema to implement Standard Schema.
 *
 * @param schema - Value to check
 * @param context - Subject of the error message, for example `Element 'text' schema`
 * @throws {Error} When `schema` has no `~standard.validate` function
 */
export function assertStandardSchema(schema: unknown, context = 'Registration schema'): StandardSchemaV1 {
	const standard =
		schema !== null && (typeof schema === 'object' || typeof schema === 'function')
			? (schema as Partial<StandardSchemaV1>)['~standard']
			: undefined;
	if (typeof standard?.validate !== 'function') {
		throw new Error(`${context} must implement Standard Schema (~standard.validate).`);
	}
	return schema as StandardSchemaV1;
}

/** Options of {@link createRegistry}. */
export interface CreateRegistryOptions {
	/**
	 * What a second registration of one `$type` does: replace the first (`'override'`, the default) or fail the build
	 * (`'error'`).
	 *
	 * @remarks
	 * `'override'` is how `[...defaults, custom]` replaces a built-in. Use `'error'` for a catalog where a repeated
	 * key is always a mistake, such as component keys.
	 */
	readonly duplicates?: 'override' | 'error';
}

/**
 * Build a frozen, read-only registry from a list of registrations.
 *
 * @param kind - Label for errors, for example `Element`
 * @param registrations - Registrations to store, keyed by `$type`
 * @param options - How to treat a repeated `$type`, see {@link CreateRegistryOptions}
 * @throws {Error} `Widget 'card' is registered twice.` when `duplicates` is `'error'` and a `$type` repeats, before any
 * schema is checked
 * @throws {Error} Naming the `$type` when a winning registration's schema is not a Standard Schema
 *
 * @remarks
 * By default a later registration with the same `$type` replaces the earlier one without a
 * warning, so `[...defaults, custom]` is the way to override. A replaced key
 * keeps its first position. Only the winning registration of each key is
 * checked. The registry stores a frozen shallow copy of each winner, taken at
 * build, and leaves the objects you passed untouched. Later assignments to or
 * spies on those objects do not reach the registry, so patch before building or
 * build a new registry. The copy shares nested values such as `schema` with the
 * original.
 *
 * Use {@link BaseRegistry} instead when registrations arrive at runtime.
 */
export function createRegistry<const TRegistration extends BaseRegistration>(
	kind: string,
	registrations: readonly TRegistration[],
	options: CreateRegistryOptions = {},
): ReadOnlyRegistry<TRegistration> {
	const winners = new Map<string, TRegistration>();
	for (const registration of registrations) {
		if (options.duplicates === 'error' && winners.has(registration.$type)) {
			throw new Error(`${kind} '${registration.$type}' is registered twice.`);
		}
		winners.set(registration.$type, registration);
	}
	const entries = new Map<string, Readonly<TRegistration>>();
	for (const [key, registration] of winners) {
		assertStandardSchema(registration.schema, `${kind} '${key}' schema`);
		entries.set(key, Object.freeze({ ...registration }));
	}
	const all = Object.freeze([...entries.values()]);
	const keys = Object.freeze([...entries.keys()]);

	return Object.freeze({
		kind,
		size: entries.size,
		get: (key: string) => entries.get(key),
		has: (key: string) => entries.has(key),
		all: () => all,
		keys: () => keys,
	});
}

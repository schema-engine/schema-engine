import type { StandardSchemaV1 } from '@standard-schema/spec';
import { RegistryError, type RegistryErrorDetails } from './registry-error.js';
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

function isStandardSchema(schema: unknown): schema is StandardSchemaV1 {
	const standard =
		schema !== null && (typeof schema === 'object' || typeof schema === 'function')
			? (schema as Partial<StandardSchemaV1>)['~standard']
			: undefined;
	return typeof standard?.validate === 'function';
}

const standardSchemaMessage = (context: string) => `${context} must implement Standard Schema (~standard.validate).`;

/**
 * Require a registration schema to implement Standard Schema.
 *
 * @param schema - Value to check
 * @param context - Subject of the error message, for example `Element 'text' schema`
 * @throws {Error} When `schema` has no `~standard.validate` function
 *
 * @remarks
 * A plain `Error`, not a {@link RegistryError}: the caller is not building a registry, so there is no `kind` or
 * `$type` to report, only the free-form `context`. {@link createRegistry} runs the same check and throws a
 * `RegistryError` with code `'invalid-schema'`.
 */
export function assertStandardSchema(schema: unknown, context = 'Registration schema'): StandardSchemaV1 {
	if (!isStandardSchema(schema)) throw new Error(standardSchemaMessage(context));
	return schema;
}

/**
 * Check the `childPaths` of a registration.
 *
 * @remarks
 * Two paths that read the same once joined with dots would share one key of `ParsedNode.children`, so they count as
 * one path declared twice. A path that runs through another one would reach inside a child node, whose own
 * registration says where its children are, so the walk would visit the same node from two parents.
 */
function assertChildPaths(childPaths: unknown, context: string, details: RegistryErrorDetails): void {
	if (childPaths === undefined) return;
	if (!Array.isArray(childPaths)) {
		throw new RegistryError('invalid-child-paths', `${context} childPaths must be a list of key paths.`, details);
	}
	const paths: string[][] = [];
	for (const keys of childPaths as unknown[]) {
		if (!Array.isArray(keys) || keys.length === 0 || keys.some((key) => typeof key !== 'string' || key === '')) {
			throw new RegistryError(
				'invalid-child-paths',
				`${context} childPaths must hold non-empty lists of non-empty keys.`,
				details,
			);
		}
		paths.push(keys as string[]);
	}
	const joined = paths.map((keys) => keys.join('.'));
	for (const [index, keys] of paths.entries()) {
		const name = keys.join('.');
		if (joined.indexOf(name) !== index) {
			throw new RegistryError('duplicate-child-path', `${context} declares the child path '${name}' twice.`, {
				...details,
				childPath: [...keys],
			});
		}
		const outer = paths.find(
			(other) => other.length < keys.length && other.every((key, position) => key === keys[position]),
		);
		if (outer) {
			throw new RegistryError(
				'nested-child-path',
				`${context} child path '${name}' runs through the child path '${outer.join('.')}'.`,
				{ ...details, childPath: [...keys], outerChildPath: [...outer] },
			);
		}
	}
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
 * @throws {RegistryError} Code `'duplicate-type'`, `Widget 'card' is registered twice.`, when `duplicates` is `'error'`
 * and a `$type` repeats, before any schema is checked
 * @throws {RegistryError} Code `'invalid-schema'`, naming the `$type`, when a winning registration's schema is not a
 * Standard Schema
 * @throws {RegistryError} Naming the `$type`, with code `'invalid-child-paths'` when a winning registration's
 * `childPaths` is not a list of non-empty key lists, `'duplicate-child-path'` when it repeats a path
 * (`childPath`), or `'nested-child-path'` when a path (`childPath`) runs through another (`outerChildPath`)
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
			throw new RegistryError('duplicate-type', `${kind} '${registration.$type}' is registered twice.`, {
				kind,
				$type: registration.$type,
			});
		}
		winners.set(registration.$type, registration);
	}
	const entries = new Map<string, Readonly<TRegistration>>();
	for (const [key, registration] of winners) {
		const details = { kind, $type: key };
		if (!isStandardSchema(registration.schema)) {
			throw new RegistryError('invalid-schema', standardSchemaMessage(`${kind} '${key}' schema`), details);
		}
		assertChildPaths(registration.childPaths, `${kind} '${key}'`, details);
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

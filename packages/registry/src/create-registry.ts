import type { StandardSchemaV1 } from '@standard-schema/spec';
import { RegistryError, type RegistryErrorDetails } from './registry-error.js';
import type { CheckChildPaths } from './tree-types.js';
import type { BaseRegistration } from './types.js';

/**
 * The read side of every registry: what {@link createRegistry} returns, and what a {@link MutableRegistry} also has.
 * It has no `register` or `clear`; to change the contents of one built by {@link createRegistry}, build another
 * registry from a new list.
 */
export interface ReadOnlyRegistry<TRegistration extends BaseRegistration = BaseRegistration> {
	/** Label used in errors, for example `Element`. */
	readonly kind: string;
	/**
	 * A sentence that follows the message of a `$type` the registry does not answer, such as where to register it.
	 * Set by the `hint` option; absent without it.
	 *
	 * @remarks
	 * It is the `hint` of {@link NodeLookup}, so a registry is a lookup with its hint, and `safeParseNode`,
	 * `safeParseTree` and every function that takes a lookup report it.
	 */
	readonly hint?: string;
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

function sameKeys(left: readonly string[], right: readonly string[]): boolean {
	return left.length === right.length && left.every((key, position) => key === right[position]);
}

function isNonEmptyString(value: unknown): value is string {
	return typeof value === 'string' && value !== '';
}

/**
 * Check the `childPaths` of a registration.
 *
 * @remarks
 * Paths are compared key by key, so `['a.b']` and `['a', 'b']` are two different paths. Two equal paths are one path
 * declared twice. A path that runs through another one would reach inside a child node, whose own registration says
 * where its children are, so the walk would visit the same node from two parents. The shape of an entry is checked
 * here as well as by the types, because a registration may arrive as parsed data.
 */
function assertChildPaths(childPaths: unknown, context: string, details: RegistryErrorDetails): void {
	if (childPaths === undefined) return;
	const invalid = (message: string) => new RegistryError('invalid-child-paths', `${context} ${message}`, details);
	if (!Array.isArray(childPaths)) throw invalid('childPaths must be a list of child paths.');
	const paths: string[][] = [];
	for (const [index, entry] of (childPaths as unknown[]).entries()) {
		const name = `childPaths[${index}]`;
		if (typeof entry !== 'object' || entry === null || Array.isArray(entry)) {
			throw invalid(`${name} must be an object { keys, accepts?, list? }.`);
		}
		const extra = Object.keys(entry).find(
			(property) => property !== 'keys' && property !== 'accepts' && property !== 'list',
		);
		if (extra !== undefined)
			throw invalid(`${name} has the property '${extra}', which a child path does not have.`);
		const { keys, accepts, list } = entry as { keys?: unknown; accepts?: unknown; list?: unknown };
		if (!Array.isArray(keys) || keys.length === 0 || !keys.every(isNonEmptyString)) {
			throw invalid(`${name}.keys must be a non-empty list of non-empty strings.`);
		}
		if (accepts !== undefined) {
			if (!Array.isArray(accepts) || accepts.length === 0 || !accepts.every(isNonEmptyString)) {
				throw invalid(`${name}.accepts must be a non-empty list of non-empty $types when present.`);
			}
			const repeated = (accepts as string[]).find((type, position) => accepts.indexOf(type) !== position);
			if (repeated !== undefined) throw invalid(`${name}.accepts names '${repeated}' twice.`);
		}
		if (list !== undefined && list !== true) throw invalid(`${name}.list must be true when present.`);
		paths.push(keys as string[]);
	}
	for (const [index, keys] of paths.entries()) {
		const name = keys.join('.');
		if (paths.findIndex((other) => sameKeys(other, keys)) !== index) {
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

/**
 * Check one registration the way both registry factories do, so their errors cannot drift.
 *
 * @throws {RegistryError} Code `'invalid-schema'`, or one of the child path codes of {@link createRegistry}
 */
function assertRegistration(kind: string, registration: BaseRegistration): void {
	const details = { kind, $type: registration.$type };
	if (!isStandardSchema(registration.schema)) {
		throw new RegistryError(
			'invalid-schema',
			standardSchemaMessage(`${kind} '${registration.$type}' schema`),
			details,
		);
	}
	assertChildPaths(registration.childPaths, `${kind} '${registration.$type}'`, details);
}

function duplicateTypeError(kind: string, type: string): RegistryError {
	return new RegistryError('duplicate-type', `${kind} '${type}' is registered twice.`, { kind, $type: type });
}

/** Options of {@link createRegistry} and {@link createMutableRegistry}. */
export interface CreateRegistryOptions {
	/** The `hint` of the registry, see {@link ReadOnlyRegistry.hint}. */
	readonly hint?: string;
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
 * `childPaths` is not a list of `{ keys, accepts?, list? }` objects (a property other than those three, empty or
 * non-string keys, an empty or repeating `accepts`, a `list` that is not `true`), `'duplicate-child-path'` when it repeats a path (`childPath`), or
 * `'nested-child-path'` when a path (`childPath`) runs through another (`outerChildPath`). Paths are compared key by
 * key.
 *
 * @remarks
 * The types check that the schema output declares every key of every child path (`childPathNotInSchema`), where the
 * output type can be read, and that a child path written inline has no property other than `keys`, `accepts` and `list`
 * (`childPathUnknownProperty`).
 *
 * By default a later registration with the same `$type` replaces the earlier one without a
 * warning, so `[...defaults, custom]` is the way to override. A replaced key
 * keeps its first position. Only the winning registration of each key is
 * checked. The registry stores a frozen shallow copy of each winner, taken at
 * build, and leaves the objects you passed untouched. Later assignments to or
 * spies on those objects do not reach the registry, so patch before building or
 * build a new registry. The copy shares nested values such as `schema` with the
 * original.
 *
 * Use {@link createMutableRegistry} instead when registrations arrive at runtime.
 */
export function createRegistry<const TRegistration extends BaseRegistration>(
	kind: string,
	registrations: readonly TRegistration[] & CheckChildPaths<TRegistration>,
	options: CreateRegistryOptions = {},
): ReadOnlyRegistry<TRegistration> {
	const winners = new Map<string, TRegistration>();
	for (const registration of registrations) {
		if (options.duplicates === 'error' && winners.has(registration.$type)) {
			throw duplicateTypeError(kind, registration.$type);
		}
		winners.set(registration.$type, registration);
	}
	const entries = new Map<string, Readonly<TRegistration>>();
	for (const [key, registration] of winners) {
		assertRegistration(kind, registration);
		entries.set(key, Object.freeze({ ...registration }));
	}
	const all = Object.freeze([...entries.values()]);
	const keys = Object.freeze([...entries.keys()]);

	return Object.freeze({
		kind,
		...(options.hint === undefined ? {} : { hint: options.hint }),
		size: entries.size,
		get: (key: string) => entries.get(key),
		has: (key: string) => entries.has(key),
		all: () => all,
		keys: () => keys,
	});
}

/**
 * A registry that takes registrations after it exists: the read side of a {@link createRegistry} result, plus
 * `register` and `clear`.
 */
export interface MutableRegistry<
	TRegistration extends BaseRegistration = BaseRegistration,
> extends ReadOnlyRegistry<TRegistration> {
	/**
	 * Add a registration, keyed by its `$type`.
	 *
	 * @throws {RegistryError} The codes {@link createRegistry} gives for a registration: `'invalid-schema'`,
	 * `'invalid-child-paths'`, `'duplicate-child-path'`, `'nested-child-path'`, and `'duplicate-type'` when the registry
	 * was built with `{ duplicates: 'error' }`
	 *
	 * @remarks
	 * The registry is unchanged when `register` throws. A repeated `$type` replaces the earlier registration and keeps
	 * its first position. The registry stores a frozen shallow copy. `accepts` may name a `$type` that is not registered
	 * yet: `safeParseTree` reports a node it cannot find as an issue.
	 */
	register<const T extends TRegistration>(registration: T & CheckChildPaths<T>): void;
	/** Remove every registration. */
	clear(): void;
}

/**
 * Build an empty registry that takes registrations at runtime, such as a plugin system's.
 *
 * @param kind - Label for errors, for example `Plugin`
 * @param options - How to treat a repeated `$type`, see {@link CreateRegistryOptions}
 *
 * @remarks
 * Its read side matches a {@link createRegistry} result, so it goes wherever a registry is read. `all()` and `keys()`
 * return the same frozen array until the next `register` or `clear`. `register` checks each registration as
 * {@link createRegistry} does. The registry logs nothing: call `has` before `register` to warn about an override.
 */
export function createMutableRegistry<TRegistration extends BaseRegistration = BaseRegistration>(
	kind: string,
	options: CreateRegistryOptions = {},
): MutableRegistry<TRegistration> {
	const entries = new Map<string, Readonly<TRegistration>>();
	let all: readonly TRegistration[] | undefined;
	let keys: readonly string[] | undefined;

	return Object.freeze({
		kind,
		...(options.hint === undefined ? {} : { hint: options.hint }),
		get size() {
			return entries.size;
		},
		get: (key: string) => entries.get(key),
		has: (key: string) => entries.has(key),
		all: () => (all ??= Object.freeze([...entries.values()])),
		keys: () => (keys ??= Object.freeze([...entries.keys()])),
		register: (registration: TRegistration) => {
			if (options.duplicates === 'error' && entries.has(registration.$type)) {
				throw duplicateTypeError(kind, registration.$type);
			}
			assertRegistration(kind, registration);
			entries.set(registration.$type, Object.freeze({ ...registration }));
			all = keys = undefined;
		},
		clear: () => {
			entries.clear();
			all = keys = undefined;
		},
	});
}

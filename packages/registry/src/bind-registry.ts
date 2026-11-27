import { createRegistry, type ReadOnlyRegistry } from './create-registry.js';
import { RegistryError } from './registry-error.js';
import type { BaseRegistration } from './types.js';

/** What a binding may not set: the keys its contract already defines. */
type ContractKeys<TContract> = { readonly [K in keyof TContract]?: never };

/** The binding each `$type` of a contracts registry takes, which may not set a key of its own contract. */
type BindingsOf<TContract extends BaseRegistration> = {
	readonly [K in TContract['$type']]: Readonly<Record<string, unknown>> &
		ContractKeys<Extract<TContract, { $type: K }>>;
};

/** The keys of `TBindings` that no contract answers; each is typed `never`, so naming one is a compile error. */
type ExtraBindings<TBindings, TContract extends BaseRegistration> = {
	readonly [K in Exclude<keyof TBindings, TContract['$type']>]: never;
};

/**
 * One binding per `$type` of a contracts registry, every binding of the same shape.
 *
 * @remarks
 * Use it with `satisfies` to fix what one renderer binds:
 * `{ card: { render: Card } } satisfies RegistryBindings<typeof contracts, ReactBinding>`.
 * A contracts registry whose `$type` is a plain `string` has no known keys to require, so only {@link bindRegistry}'s
 * build-time checks apply to it.
 */
export type RegistryBindings<TRegistry extends ReadOnlyRegistry, TBinding extends object = object> =
	TRegistry extends ReadOnlyRegistry<infer TContract> ? { readonly [K in TContract['$type']]: TBinding } : never;

/** A contract merged with the binding its `$type` names, member by member. */
export type BoundRegistration<TContract extends BaseRegistration, TBindings> = TContract extends unknown
	? TContract & TBindings[TContract['$type'] & keyof TBindings]
	: never;

/** The `$type`s of a contracts registry that are known literals; `never` when the contracts are typed only as `string`. */
type KnownTypes<TContract extends BaseRegistration> = string extends TContract['$type'] ? never : TContract['$type'];

/**
 * What {@link bindRegistry} returns: a read-only registry whose `get` also answers a known `$type` without `undefined`.
 *
 * @remarks
 * `get` returns the registration of that exact `$type` when the contracts name their `$type`s as literals, because
 * `bindRegistry` guarantees every contract is bound. The `string` overload stays for a `$type` read from a document.
 */
export interface BoundRegistry<TContract extends BaseRegistration, TBindings> extends ReadOnlyRegistry<
	BoundRegistration<TContract, TBindings>
> {
	get<K extends KnownTypes<TContract>>(key: K): Extract<BoundRegistration<TContract, TBindings>, { $type: K }>;
	get(key: string): BoundRegistration<TContract, TBindings> | undefined;
}

/**
 * Build a renderer's registry from a registry of contracts and one binding per `$type`.
 *
 * @param contracts - Registrations without the renderer's part: the `$type`, schema and metadata, plus what the domain fixes
 * @param bindings - What this renderer adds to each contract, keyed by `$type`, such as `render` or a tag name
 * @throws {RegistryError} Code `'missing-binding'`, `Widget 'card' has no binding.`, when a contract has no binding
 * @throws {RegistryError} Code `'unknown-binding'`, `Widget binding 'crad' names no registration.`, when a binding's
 * key is no contract's `$type`
 * @throws {RegistryError} Code `'binding-overrides-contract'`, `Widget 'card' binding sets 'schema', which the contract
 * defines.`, when a binding sets a contract key
 * @throws {RegistryError} The errors of {@link createRegistry}, when a merged registration breaks one of its rules
 *
 * @remarks
 * The result is a frozen registry built with {@link createRegistry}, so it keeps the contracts' order and checks every
 * schema again. Each registration is a shallow merge, so `schema`, `metadata` and every other value of a contract is
 * shared by identity between all the renderers that bind it. A binding is renderer-only data (a `render` function, a
 * tag name) and never carries schema or metadata.
 *
 * With contracts typed by literal `$type`, a missing binding, an extra one and a binding that sets a contract key are
 * also compile errors. With contracts typed only as `string` the three checks run when the registry is built.
 */
export function bindRegistry<TContract extends BaseRegistration, const TBindings extends BindingsOf<TContract>>(
	contracts: ReadOnlyRegistry<TContract>,
	bindings: TBindings & ExtraBindings<TBindings, TContract>,
): BoundRegistry<TContract, TBindings>;
export function bindRegistry(
	contracts: ReadOnlyRegistry,
	bindings: Readonly<Record<string, object>>,
): ReadOnlyRegistry<BaseRegistration> {
	const { kind } = contracts;
	for (const key of Object.keys(bindings)) {
		if (!contracts.has(key)) {
			throw new RegistryError('unknown-binding', `${kind} binding '${key}' names no registration.`, {
				kind,
				$type: key,
			});
		}
	}
	const bound = contracts.all().map((contract) => {
		const binding: unknown = Object.hasOwn(bindings, contract.$type) ? bindings[contract.$type] : undefined;
		if (typeof binding !== 'object' || binding === null) {
			throw new RegistryError('missing-binding', `${kind} '${contract.$type}' has no binding.`, {
				kind,
				$type: contract.$type,
			});
		}
		for (const key of Object.keys(binding)) {
			if (Object.hasOwn(contract, key)) {
				throw new RegistryError(
					'binding-overrides-contract',
					`${kind} '${contract.$type}' binding sets '${key}', which the contract defines.`,
					{ kind, $type: contract.$type },
				);
			}
		}
		return { ...contract, ...binding };
	});
	return createRegistry(kind, bound);
}

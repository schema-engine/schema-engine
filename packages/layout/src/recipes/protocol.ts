import {
	assertStandardSchema,
	createRegistry,
	RegistryError,
	type BaseRegistration,
	type CreateRegistryOptions,
	type ReadOnlyRegistry,
} from '@schema-engine/registry';

/** The part of a recipe that a protocol reads: its `$type`, kind and the slots it declares. */
export interface RecipeShape<TSlot extends string = string, TKind extends string = string> {
	readonly $type: string;
	readonly kind: TKind;
	readonly slots: readonly TSlot[];
}

/**
 * A named check a domain runs on every recipe of its protocol.
 *
 * @remarks
 * `check` returns the problem as a phrase that continues "Recipe 'x' breaks rule 'name': ", or
 * `undefined` when the recipe passes. Rules read the declared kind and slots only. The slot and
 * kind vocabulary is checked before rules run, so a rule never sees a name outside the protocol.
 */
export interface RecipeRule<TSlot extends string = string, TKind extends string = string> {
	readonly name: string;
	check(recipe: RecipeShape<TSlot, TKind>): string | undefined;
}

/**
 * The slots, kinds and rules one domain gives its recipes.
 *
 * @remarks
 * `slots` is ordered: it is the order a spec lists its declared slots in, and the order a renderer
 * can compose them in.
 */
export interface RecipeProtocol<TSlot extends string = string, TKind extends string = string> {
	readonly slots: readonly TSlot[];
	readonly kinds: readonly TKind[];
	readonly rules: readonly RecipeRule<TSlot, TKind>[];
}

export type SlotOf<TProtocol extends RecipeProtocol> = TProtocol extends RecipeProtocol<infer TSlot> ? TSlot : never;

export type KindOf<TProtocol extends RecipeProtocol> =
	TProtocol extends RecipeProtocol<string, infer TKind> ? TKind : never;

function assertUnique(values: readonly string[], noun: 'slot' | 'kind'): void {
	if (values.length === 0) {
		throw new Error(`A recipe protocol must declare at least one ${noun}.`);
	}
	const seen = new Set<string>();
	for (const value of values) {
		if (seen.has(value)) {
			throw new Error(`A recipe protocol's ${noun} '${value}' is declared twice.`);
		}
		seen.add(value);
	}
}

/**
 * Declares the slots, kinds and rules of one domain's recipes, once.
 *
 * @param definition.slots - Slot names in composition order
 * @param definition.kinds - Kind names a recipe can take
 * @param definition.rules - Checks run on each recipe when a spec is defined and when a registry is built
 * @throws {Error} When no slot or kind is declared, or a name repeats
 */
export function defineRecipeProtocol<const TSlot extends string, const TKind extends string>(definition: {
	slots: readonly TSlot[];
	kinds: readonly TKind[];
	rules?: readonly RecipeRule<NoInfer<TSlot>, NoInfer<TKind>>[];
}): RecipeProtocol<TSlot, TKind> {
	assertUnique(definition.slots, 'slot');
	assertUnique(definition.kinds, 'kind');
	return Object.freeze({
		slots: Object.freeze([...definition.slots]),
		kinds: Object.freeze([...definition.kinds]),
		rules: Object.freeze([...(definition.rules ?? [])]),
	});
}

/**
 * Checks a recipe against its protocol: the kind and every slot must be declared, then each rule runs.
 *
 * @throws {RegistryError} Code `'invalid-declaration'`, naming the recipe and the rule when one fails
 *
 * @remarks
 * Runs in `defineProtocolRecipeSpec` for an early failure and in {@link createRecipeRegistry} for each winning
 * registration, which also covers hand-written recipes whose schema is not a Zod schema.
 *
 * The vocabulary is checked before any rule runs, so the narrowing of the recipe to the protocol's
 * own slot and kind names, which the rules receive, holds.
 */
export function assertRecipeRules<TSlot extends string, TKind extends string>(
	protocol: RecipeProtocol<TSlot, TKind>,
	recipe: RecipeShape,
): void {
	const kinds: readonly string[] = protocol.kinds;
	const slots: readonly string[] = protocol.slots;
	const details = { kind: 'Recipe', $type: recipe.$type };
	if (!kinds.includes(recipe.kind)) {
		throw new RegistryError(
			'invalid-declaration',
			`Recipe '${recipe.$type}' has kind '${recipe.kind}', which the protocol does not declare (kinds: ${protocol.kinds.join(', ')}).`,
			details,
		);
	}
	for (const slot of recipe.slots) {
		if (!slots.includes(slot)) {
			throw new RegistryError(
				'invalid-declaration',
				`Recipe '${recipe.$type}' declares slot '${slot}', which the protocol does not declare (slots: ${protocol.slots.join(', ')}).`,
				details,
			);
		}
	}
	for (const rule of protocol.rules) {
		const problem = rule.check(recipe as RecipeShape<TSlot, TKind>);
		if (problem !== undefined) {
			throw new RegistryError(
				'invalid-declaration',
				`Recipe '${recipe.$type}' breaks rule '${rule.name}': ${problem}.`,
				details,
			);
		}
	}
}

/**
 * Checks that the slot schemas a registration carries are exactly its declared slots, each a Standard Schema.
 *
 * @throws {RegistryError} Code `'invalid-declaration'` for a mismatch and `'invalid-schema'` for a slot without a Standard Schema
 *
 * @remarks
 * A registration without `slotSchemas` passes: a hand-written one need not state them.
 */
function assertSlotSchemas(
	kind: string,
	recipe: RecipeShape & { readonly slotSchemas?: Readonly<Partial<Record<string, unknown>>> },
): void {
	const { slotSchemas } = recipe;
	if (slotSchemas === undefined) return;
	const context = `${kind} '${recipe.$type}' slotSchemas`;
	const details = { kind, $type: recipe.$type };
	const listed = Object.keys(slotSchemas).filter((slot) => slotSchemas[slot] !== undefined);
	const missing = recipe.slots.filter((slot) => !listed.includes(slot));
	const extra = listed.filter((slot) => !recipe.slots.includes(slot));
	if (missing.length > 0 || extra.length > 0) {
		throw new RegistryError(
			'invalid-declaration',
			`${context} must list exactly the recipe's slots (${recipe.slots.join(', ') || 'none'}): ${[
				...missing.map((slot) => `'${slot}' has no schema`),
				...extra.map((slot) => `'${slot}' is not a declared slot`),
			].join(', ')}.`,
			details,
		);
	}
	for (const slot of listed) {
		try {
			assertStandardSchema(slotSchemas[slot], `${context}.${slot}`);
		} catch (error) {
			if (!(error instanceof Error)) throw error;
			throw new RegistryError('invalid-schema', error.message, details);
		}
	}
}

/**
 * Builds the read-only `Recipe` registry of a domain, with its protocol rules run at build.
 *
 * @param options - The registry options, such as the `hint` of an unregistered `$type`
 *
 * @throws {RegistryError} Code `'invalid-declaration'` for a winning recipe that breaks the protocol or whose
 * `slotSchemas` differ from its slots and `'invalid-schema'` for a recipe or slot without a Standard Schema
 *
 * @remarks
 * Only the winning registration of each `$type` is checked, the same as the registry's schema check: a
 * recipe overridden later in the list is skipped.
 */
export function createRecipeRegistry<
	TSlot extends string,
	TKind extends string,
	TRecipe extends BaseRegistration &
		RecipeShape<TSlot, TKind> & { readonly slotSchemas?: Readonly<Partial<Record<string, unknown>>> },
>(
	protocol: RecipeProtocol<TSlot, TKind>,
	recipes: readonly TRecipe[],
	options?: CreateRegistryOptions,
): ReadOnlyRegistry<TRecipe> {
	const registry = createRegistry('Recipe', recipes, options);
	for (const recipe of registry.all()) {
		assertRecipeRules(protocol, recipe);
		assertSlotSchemas(registry.kind, recipe);
	}
	return registry;
}

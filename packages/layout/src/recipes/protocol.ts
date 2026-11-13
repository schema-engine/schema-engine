import { createRegistry, type BaseRegistration, type ReadOnlyRegistry } from '@schema-engine/registry';

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
 * @throws {Error} Naming the recipe, and the rule when one fails
 *
 * @remarks
 * Runs in `defineRecipeSpec` for an early failure and in {@link createRecipeRegistry} for each winning
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
	if (!kinds.includes(recipe.kind)) {
		throw new Error(
			`Recipe '${recipe.$type}' has kind '${recipe.kind}', which the protocol does not declare (kinds: ${protocol.kinds.join(', ')}).`,
		);
	}
	for (const slot of recipe.slots) {
		if (!slots.includes(slot)) {
			throw new Error(
				`Recipe '${recipe.$type}' declares slot '${slot}', which the protocol does not declare (slots: ${protocol.slots.join(', ')}).`,
			);
		}
	}
	for (const rule of protocol.rules) {
		const problem = rule.check(recipe as RecipeShape<TSlot, TKind>);
		if (problem !== undefined) {
			throw new Error(`Recipe '${recipe.$type}' breaks rule '${rule.name}': ${problem}.`);
		}
	}
}

/**
 * Builds the read-only `Recipe` registry of a domain, with its protocol rules run at build.
 *
 * @throws {Error} Naming the recipe when a winning registration breaks the protocol or has no Standard Schema
 *
 * @remarks
 * Only the winning registration of each `$type` is checked, the same as the registry's schema check: a
 * recipe overridden later in the list is skipped.
 */
export function createRecipeRegistry<
	TSlot extends string,
	TKind extends string,
	TRecipe extends BaseRegistration & RecipeShape<TSlot, TKind>,
>(protocol: RecipeProtocol<TSlot, TKind>, recipes: readonly TRecipe[]): ReadOnlyRegistry<TRecipe> {
	const registry = createRegistry('Recipe', recipes);
	for (const recipe of registry.all()) {
		assertRecipeRules(protocol, recipe);
	}
	return registry;
}

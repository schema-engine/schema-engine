import type { StandardSchemaV1 } from '@standard-schema/spec';
import { formatIssuePath, safeParseStandardSchema, standardSchema } from '@schema-engine/registry';
import type { AppearanceAxisList, SlotAppearanceAxes } from '../lib/appearance';
import { assertRecipeRules, type RecipeProtocol } from './protocol';
import { unknownViewKeyMessage } from './resolve-recipe-view';
import type { RecipeMetadata, RecipeSlotDefaults, ProtocolRecipeSlotSchemas, ProtocolRecipeSpec } from './types';

type Flat<T> = { [K in keyof T]: T[K] };

/** What an author writes for a view: the literal `$type`, every declared slot optional. */
type RecipeViewSchemaInput<TType extends string, TSlots extends ProtocolRecipeSlotSchemas> = Flat<
	{ $type: TType } & { -readonly [K in keyof TSlots]?: StandardSchemaV1.InferInput<NonNullable<TSlots[K]>> }
>;

/** A parsed view: every declared slot present, as its schema outputs it. */
type RecipeViewSchemaOutput<TType extends string, TSlots extends ProtocolRecipeSlotSchemas> = Flat<
	{ $type: TType } & { -readonly [K in keyof TSlots]-?: StandardSchemaV1.InferOutput<NonNullable<TSlots[K]>> }
>;

/**
 * Strict view schema of a spec: the literal `$type` plus each declared slot, which parses from `{}` when omitted.
 *
 * @remarks
 * A Standard Schema, not a schema of any one library, so slot schemas can come from any library. It validates
 * synchronously and so needs synchronous slot schemas: a slot that validates asynchronously throws where the view is
 * parsed. A slot is an optional key on input and always present on output, so each slot schema's own defaults fill
 * it. A key outside `$type` and the declared slots is an issue at `[key]`. The input and output types let the engine
 * infer the authoring type of `view` from a registration.
 */
export type RecipeViewSchema<TType extends string, TSlots extends ProtocolRecipeSlotSchemas> = StandardSchemaV1<
	RecipeViewSchemaInput<TType, TSlots>,
	RecipeViewSchemaOutput<TType, TSlots>
>;

/** The axes a spec may declare per slot: a slot whose schema input has no `appearance` key takes none. */
type SlotAppearanceAxesOf<TSlots extends ProtocolRecipeSlotSchemas> = {
	[K in keyof TSlots]?: 'appearance' extends keyof StandardSchemaV1.InferInput<NonNullable<TSlots[K]>>
		? AppearanceAxisList
		: never;
};

/**
 * What a domain passes to `defineProtocolRecipeSpec`; the slot and kind names come from its protocol.
 *
 * @remarks
 * The slots come from `slotSchemas` alone: `slotDefaults` and `appearanceAxes` are checked
 * against them but take no part in inference, so a spec can add a slot to another spec's schemas
 * while reusing that spec's defaults.
 *
 * `slotSchemas` also maps every key outside the protocol's slots to `never`. The `TSlots` constraint
 * alone accepts extra properties, so without it a slot the protocol does not declare would compile.
 *
 * `appearanceAxes` accepts only slots whose schema input has an `appearance` key, so a slot that cannot
 * be given a pick does not declare axes.
 */
export interface ProtocolRecipeSpecDefinition<
	TSlot extends string,
	TKind extends string,
	TType extends string,
	TSlots extends ProtocolRecipeSlotSchemas<TSlot>,
> {
	$type: TType;
	kind: NoInfer<TKind>;
	metadata: RecipeMetadata;
	slotSchemas?: TSlots & { [K in Exclude<keyof TSlots, TSlot>]: never };
	slotDefaults?: RecipeSlotDefaults<NoInfer<TSlots>>;
	appearanceAxes?: SlotAppearanceAxesOf<NoInfer<TSlots>>;
}

/**
 * @remarks
 * The output is assembled dynamically from the same slot schemas that `RecipeViewSchema` maps over,
 * so the cast only restores the static type TypeScript cannot derive from a loop. A slot an author omits
 * is validated as `{}`, as an object's own defaults would fill it.
 */
function createRecipeViewSchema<const TType extends string, const TSlots extends ProtocolRecipeSlotSchemas>(
	$type: TType,
	slots: readonly string[],
	slotSchemas: TSlots,
): RecipeViewSchema<TType, TSlots> {
	return standardSchema<RecipeViewSchemaOutput<TType, TSlots>, RecipeViewSchemaInput<TType, TSlots>>((value) => {
		if (typeof value !== 'object' || value === null || Array.isArray(value)) {
			return { issues: [{ message: 'Expected a view object.', path: [] }] };
		}
		const view = value as Record<string, unknown>;
		const issues: StandardSchemaV1.Issue[] = [];
		if (view.$type !== $type) {
			issues.push({ message: `Expected $type '${$type}'.`, path: ['$type'] });
		}
		for (const key of Object.keys(view)) {
			if (key !== '$type' && !slots.includes(key)) {
				issues.push({ message: unknownViewKeyMessage($type, key, slots), path: [key] });
			}
		}
		const output: Record<string, unknown> = { $type };
		for (const slot of slots) {
			const schema = slotSchemas[slot];
			if (!schema) continue;
			const result = safeParseStandardSchema(schema, view[slot] === undefined ? {} : view[slot]);
			if (result.success) {
				output[slot] = result.data;
			} else {
				issues.push(...result.error.issues.map((issue) => ({ ...issue, path: [slot, ...(issue.path ?? [])] })));
			}
		}
		return issues.length > 0 ? { issues } : { value: output as RecipeViewSchemaOutput<TType, TSlots> };
	});
}

/**
 * One `<path>: <message>` line per location a slot schema issue points at, so a message names the offending key.
 *
 * @remarks
 * A Standard Schema issue carries a message and a path. A library may also report the offending `keys` of the object
 * at that path (Zod's unknown keys do, with the generic `Invalid input` when no locale is loaded), so each reported
 * key gets its own line at the key, the same place forms' validation points such an issue at. An empty path reads `(value)`.
 */
function describeSlotIssue(issue: StandardSchemaV1.Issue): string[] {
	const reported: unknown = (issue as StandardSchemaV1.Issue & { keys?: unknown }).keys;
	const keys = Array.isArray(reported)
		? reported.filter((key): key is string | number => typeof key === 'string' || typeof key === 'number')
		: [];
	const paths = keys.length > 0 ? keys.map((key) => [...(issue.path ?? []), key]) : [issue.path];
	return paths.map((path) => `${formatIssuePath(path) || '(value)'}: ${issue.message}`);
}

/**
 * @remarks
 * Validation only: the parsed output is discarded. The defaults are merged under the author's
 * slot config before the view schema parses, so schema defaults still fill what they leave unset.
 */
function assertSlotDefaults(
	$type: string,
	slotSchemas: ProtocolRecipeSlotSchemas,
	slotDefaults: Record<string, unknown> | undefined,
): void {
	for (const [slot, value] of Object.entries(slotDefaults ?? {})) {
		const schema = slotSchemas[slot];
		if (!schema) {
			throw new Error(`Recipe '${$type}' slotDefaults.${slot}: the recipe does not declare a '${slot}' slot.`);
		}
		const result = safeParseStandardSchema(schema, value);
		if (!result.success) {
			const problems = result.error.issues.flatMap(describeSlotIssue);
			throw new Error(`Recipe '${$type}' slotDefaults.${slot} is invalid: ${problems.join('; ')}`);
		}
	}
}

/**
 * Validation only: a slot that declares appearance axes must exist.
 *
 * @remarks
 * That the slot schema accepts an `appearance` key is a type constraint on
 * {@link ProtocolRecipeSpecDefinition.appearanceAxes}, not a runtime probe: Standard Schema reports no issue codes
 * to find a rejected key with, and validation removes `appearance` before the slot schema parses.
 */
function assertAppearanceSlots(
	$type: string,
	slotSchemas: ProtocolRecipeSlotSchemas,
	appearanceAxes: SlotAppearanceAxes | undefined,
): void {
	for (const [slot, axes] of Object.entries(appearanceAxes ?? {})) {
		if (axes && !slotSchemas[slot]) {
			throw new Error(`Recipe '${$type}' appearanceAxes.${slot}: the recipe does not declare a '${slot}' slot.`);
		}
	}
}

/**
 * Declares a recipe's `$type`, kind, slot schemas, and metadata against a domain's protocol.
 *
 * @remarks
 * The protocol decides which slots and kinds exist, in the types and at runtime, and its rules run
 * here for an early failure. The spec lists its declared slots in the protocol's order.
 *
 * The rules run before the slots are listed, because listing filters the protocol's slots and would
 * otherwise drop a slot the protocol does not declare without a word.
 *
 * A slot schema is any Standard Schema that validates synchronously. A spec that leaves out `slotSchemas` declares
 * no slots, so `TSlots` defaults to the empty object type.
 */
export function defineProtocolRecipeSpec<
	TSlot extends string,
	TKind extends string,
	const TType extends string,
	const TSlots extends ProtocolRecipeSlotSchemas<TSlot> = {},
>(
	protocol: RecipeProtocol<TSlot, TKind>,
	definition: ProtocolRecipeSpecDefinition<TSlot, TKind, TType, TSlots>,
): ProtocolRecipeSpec<TSlot, TKind, TType, RecipeViewSchema<TType, TSlots>, TSlots> {
	const slotSchemas = (definition.slotSchemas ?? {}) as TSlots;
	const declared = Object.keys(slotSchemas).filter((slot) => slotSchemas[slot as TSlot]);
	assertRecipeRules(protocol, { $type: definition.$type, kind: definition.kind, slots: declared });
	const slots = protocol.slots.filter((slot) => slotSchemas[slot]);
	assertSlotDefaults(definition.$type, slotSchemas, definition.slotDefaults);
	assertAppearanceSlots(definition.$type, slotSchemas, definition.appearanceAxes as SlotAppearanceAxes | undefined);
	const schema = createRecipeViewSchema(definition.$type, slots, slotSchemas);
	return {
		$type: definition.$type,
		kind: definition.kind,
		slots,
		slotSchemas,
		slotDefaults: definition.slotDefaults,
		appearanceAxes: definition.appearanceAxes,
		metadata: definition.metadata,
		schema,
	};
}

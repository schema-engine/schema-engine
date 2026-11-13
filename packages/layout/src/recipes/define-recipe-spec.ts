import * as z from 'zod/mini';
import type { SlotAppearanceAxes } from '../lib/appearance';
import { assertRecipeRules, type RecipeProtocol } from './protocol';
import type { RecipeMetadata, RecipeSlotDefaults, ProtocolRecipeSlotSchemas, ProtocolRecipeSpec } from './types';

/**
 * Strict view schema of a spec: the literal `$type` plus each declared slot, which defaults to `{}`.
 *
 * @remarks
 * A slot is an optional key on input and always present on output, parsed from `{}` when the author
 * omits it, so each slot schema's own defaults fill it. Keeping the concrete object type, rather than `z.ZodMiniType`, lets the engine infer the
 * authoring type of `view` from a registration.
 */
export type RecipeViewSchema<TType extends string, TSlots extends ProtocolRecipeSlotSchemas> = z.ZodMiniObject<
	{ $type: z.ZodMiniLiteral<TType> } & {
		[K in keyof TSlots]: TSlots[K] extends z.ZodMiniType ? z.ZodMiniPrefault<TSlots[K]> : never;
	},
	z.core.$strict
>;

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
	appearanceAxes?: SlotAppearanceAxes<keyof NoInfer<TSlots>>;
}

/**
 * @remarks
 * The shape is assembled dynamically from the same slot schemas that `RecipeViewSchema` maps over,
 * so the cast only restores the static type TypeScript cannot derive from a loop.
 */
function mergeRecipeSlotSchemas<const TType extends string, const TSlots extends ProtocolRecipeSlotSchemas>(
	$type: TType,
	slotSchemas: TSlots,
): RecipeViewSchema<TType, TSlots> {
	const shape: Record<string, z.ZodMiniType> = {
		$type: z.literal($type),
	};

	for (const [slot, schema] of Object.entries(slotSchemas)) {
		if (schema) {
			shape[slot] = z.prefault(schema, {});
		}
	}

	return z.strictObject(shape) as unknown as RecipeViewSchema<TType, TSlots>;
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
		const result = z.safeParse(schema, value);
		if (!result.success) {
			const problems = result.error.issues.map((issue) => {
				const keys = [...issue.path, ...('keys' in issue && Array.isArray(issue.keys) ? issue.keys : [])];
				return `${keys.join('.') || '(value)'}: ${issue.message}`;
			});
			throw new Error(`Recipe '${$type}' slotDefaults.${slot} is invalid: ${problems.join('; ')}`);
		}
	}
}

/**
 * Validation only: a slot that declares appearance axes must exist and must accept the `appearance` key.
 */
function assertAppearanceAxes(
	$type: string,
	slotSchemas: ProtocolRecipeSlotSchemas,
	appearanceAxes: SlotAppearanceAxes | undefined,
): void {
	for (const [slot, axes] of Object.entries(appearanceAxes ?? {})) {
		if (!axes) continue;
		const schema = slotSchemas[slot];
		if (!schema) {
			throw new Error(`Recipe '${$type}' appearanceAxes.${slot}: the recipe does not declare a '${slot}' slot.`);
		}
		const result = z.safeParse(schema, { appearance: {} });
		const rejectsKey = result.error?.issues.some(
			(issue) => issue.code === 'unrecognized_keys' && issue.keys.includes('appearance'),
		);
		if (rejectsKey) {
			throw new Error(
				`Recipe '${$type}' appearanceAxes.${slot}: the '${slot}' slot schema must accept an 'appearance' key (z.optional(AppearanceConfigSchema)).`,
			);
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
 */
export function defineProtocolRecipeSpec<
	TSlot extends string,
	TKind extends string,
	const TType extends string,
	const TSlots extends ProtocolRecipeSlotSchemas<TSlot> = Record<never, never>,
>(
	protocol: RecipeProtocol<TSlot, TKind>,
	definition: ProtocolRecipeSpecDefinition<TSlot, TKind, TType, TSlots>,
): ProtocolRecipeSpec<TSlot, TKind, TType, RecipeViewSchema<TType, TSlots>, TSlots> {
	const slotSchemas = (definition.slotSchemas ?? {}) as TSlots;
	const declared = Object.keys(slotSchemas).filter((slot) => slotSchemas[slot as TSlot]);
	assertRecipeRules(protocol, { $type: definition.$type, kind: definition.kind, slots: declared });
	const slots = protocol.slots.filter((slot) => slotSchemas[slot]);
	assertSlotDefaults(definition.$type, slotSchemas, definition.slotDefaults);
	assertAppearanceAxes(definition.$type, slotSchemas, definition.appearanceAxes as SlotAppearanceAxes | undefined);
	const schema = mergeRecipeSlotSchemas(definition.$type, slotSchemas);
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

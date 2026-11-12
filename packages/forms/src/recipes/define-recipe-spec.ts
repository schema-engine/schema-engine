import * as z from 'zod/mini';
import { assertRecipeKindSlots } from './assert-recipe-kind';
import type { RecipeKind, RecipeMetadata, RecipeSlot, RecipeSlotDefaults, RecipeSpec } from './types';
import { RECIPE_SLOT_ORDER } from './types';
import type { SlotAppearanceAxes } from '@/lib/appearance';

export type RecipeSlotSchemas = Partial<Record<RecipeSlot, z.ZodMiniType>>;

/**
 * Strict view schema of a spec: the literal `$type` plus each declared slot, which defaults to `{}`.
 *
 * @remarks
 * A slot is an optional key on input and always present on output, parsed from `{}` when the author
 * omits it, so each slot schema's own defaults fill it. Keeping the concrete object type, rather than `z.ZodMiniType`, lets the engine infer the
 * authoring type of `view` from a registration.
 */
export type RecipeViewSchema<TType extends string, TSlots extends RecipeSlotSchemas> = z.ZodMiniObject<
	{ $type: z.ZodMiniLiteral<TType> } & {
		[K in keyof TSlots]: TSlots[K] extends z.ZodMiniType ? z.ZodMiniPrefault<TSlots[K]> : never;
	},
	z.core.$strict
>;

/**
 * @remarks
 * The shape is assembled dynamically from the same slot schemas that `RecipeViewSchema` maps over,
 * so the cast only restores the static type TypeScript cannot derive from a loop.
 */
function mergeRecipeSlotSchemas<const TType extends string, const TSlots extends RecipeSlotSchemas>(
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
	slotSchemas: RecipeSlotSchemas,
	slotDefaults: Record<string, unknown> | undefined,
): void {
	for (const [slot, value] of Object.entries(slotDefaults ?? {})) {
		const schema = slotSchemas[slot as RecipeSlot];
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
	slotSchemas: RecipeSlotSchemas,
	appearanceAxes: SlotAppearanceAxes | undefined,
): void {
	for (const [slot, axes] of Object.entries(appearanceAxes ?? {})) {
		if (!axes) continue;
		const schema = slotSchemas[slot as RecipeSlot];
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
 * Declares a recipe's `$type`, kind, slot schemas, and metadata.
 *
 * @remarks
 * Single-step recipes cannot declare `progress`; their `actions` slot is the
 * submit-only bar. Wizard recipes must declare `actions`.
 */
export function defineRecipeSpec<
	const TType extends string,
	const TSlots extends RecipeSlotSchemas = Record<never, never>,
>(definition: {
	$type: TType;
	kind: RecipeKind;
	metadata: RecipeMetadata;
	slotSchemas?: TSlots;
	slotDefaults?: RecipeSlotDefaults<TSlots>;
	appearanceAxes?: SlotAppearanceAxes<keyof TSlots>;
}): RecipeSpec<TType, RecipeViewSchema<TType, TSlots>, TSlots> {
	const slotSchemas = (definition.slotSchemas ?? {}) as TSlots;
	const slots = RECIPE_SLOT_ORDER.filter((slot) => slotSchemas[slot]);
	assertRecipeKindSlots({ $type: definition.$type, kind: definition.kind, slots });
	assertSlotDefaults(definition.$type, slotSchemas, definition.slotDefaults);
	assertAppearanceAxes(definition.$type, slotSchemas, definition.appearanceAxes);
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

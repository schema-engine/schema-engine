import * as z from 'zod/mini';
import type { AxisRegistry } from '@/lib/appearance';

/**
 * A pick of named appearance values, one per axis: `{ size: 'compact' }`.
 *
 * @remarks
 * The shape is open because the axes belong to the theme (`createLayoutTheme({ appearance })`). A
 * domain checks each axis and value against the theme's vocabulary and the owner's declared axes.
 */
export const AppearanceConfigSchema = z.record(z.string(), z.string());

export type AppearanceConfig = z.infer<typeof AppearanceConfigSchema>;

/**
 * The pick schema of one theme: each axis is an optional enum of its values, and any other axis is
 * rejected.
 *
 * @param supported Restricts the schema to the axes one owner declares; omit it for an owner that
 * accepts every axis of the theme (the document and its steps). An empty list is a closed object
 * with no axes. A name the theme does not hold is skipped, since an engine rejects it when it builds.
 *
 * @remarks
 * Built for a JSON Schema export, so an editor autocompletes `appearance.size`. The enums are fresh
 * schemas rather than the axes' own, so the export inlines them instead of referencing a catalog
 * entry. It is built from the same registry and declarations `checkAppearance` validates against.
 */
export function createAppearanceSchema(axes: AxisRegistry, supported?: readonly string[]) {
	const entries = axes
		.all()
		.filter((axis) => supported === undefined || supported.includes(axis.$type))
		.map((axis) => [axis.$type, z.optional(z.enum(Object.keys(axis.values) as [string, ...string[]]))] as const);
	return z.strictObject(Object.fromEntries(entries));
}

function objectShape(schema: z.ZodMiniType): Record<string, z.ZodMiniType> | undefined {
	const def = schema._zod.def as { type: string; shape?: Record<string, z.ZodMiniType> };
	return def.type === 'object' ? def.shape : undefined;
}

/**
 * Replaces the `appearance` key of an object schema with the closed schema of the axes its owner
 * declares, for a JSON Schema export.
 *
 * @param supported The owner's declared axes (`appearanceAxes`); omit it for an owner that declares none.
 *
 * @remarks
 * Validation strips an authored `appearance` before it parses the owner's own schema and checks the
 * pick against the declared axes (`checkAppearance`), so the schema's own `appearance` key is only
 * ever a description. This swaps that key for one built from the same declarations, which keeps the
 * export from drifting from validation. A schema that is not a plain object (a lazy or piped
 * schema) is returned unchanged, and so is an object that declares no axes and has no `appearance`
 * key. The result is for export only: parse with the original.
 */
export function withAppearanceAxes<TSchema extends z.ZodMiniType>(
	schema: TSchema,
	axes: AxisRegistry,
	supported: readonly string[] = [],
): z.ZodMiniType {
	const shape = objectShape(schema);
	if (!shape || (supported.length === 0 && !('appearance' in shape))) return schema;
	return z.safeExtend(schema as unknown as z.ZodMiniObject, {
		appearance: z
			.optional(createAppearanceSchema(axes, supported))
			.check(z.describe('Named appearance values, one per declared axis')),
	});
}

/**
 * Applies {@link withAppearanceAxes} to each slot of a recipe's view schema, with the axes the
 * recipe declares for that slot.
 *
 * @param slotAxes The recipe's `appearanceAxes`; a slot it does not list declares none.
 *
 * @remarks
 * Expects the shape `defineProtocolRecipeSpec` builds: a strict object whose slots are objects
 * wrapped in `prefault`. Any other shape is returned unchanged. A slot that declares no axes and
 * has no `appearance` key stays as it is, so it keeps rejecting the key.
 */
export function withSlotAppearanceAxes<TSchema extends z.ZodMiniType>(
	schema: TSchema,
	axes: AxisRegistry,
	slotAxes: Readonly<Record<string, readonly string[] | undefined>> = {},
): z.ZodMiniType {
	const shape = objectShape(schema);
	if (!shape) return schema;
	const replaced: Record<string, z.ZodMiniType> = {};
	for (const [slot, slotSchema] of Object.entries(shape)) {
		const def = slotSchema._zod.def as { type: string; innerType?: z.ZodMiniType; defaultValue?: unknown };
		if (def.type === 'prefault' && def.innerType) {
			const inner = withAppearanceAxes(def.innerType, axes, slotAxes[slot]);
			if (inner !== def.innerType) replaced[slot] = z.prefault(inner, def.defaultValue as never);
			continue;
		}
		const next = withAppearanceAxes(slotSchema, axes, slotAxes[slot]);
		if (next !== slotSchema) replaced[slot] = next;
	}
	if (Object.keys(replaced).length === 0) return schema;
	return z.safeExtend(schema as unknown as z.ZodMiniObject, replaced);
}

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

/**
 * @remarks
 * Only narrows the members of a schema's definition, which Zod types as the core base. A classic
 * Zod schema passes too, since it has the same methods, and is rewritten the same way.
 */
function isMiniSchema(schema: z.core.$ZodType): schema is z.ZodMiniType {
	return 'check' in schema && typeof schema.check === 'function';
}

function isObjectSchema(schema: z.ZodMiniType): schema is z.ZodMiniObject {
	return schema._zod.def.type === 'object';
}

function isPipeSchema(schema: z.ZodMiniType): schema is z.ZodMiniPipe {
	return schema._zod.def.type === 'pipe';
}

function isPrefaultSchema(schema: z.ZodMiniType): schema is z.ZodMiniPrefault {
	return schema._zod.def.type === 'prefault';
}

/**
 * Sets the `appearance` key on the object a schema parses, looking through a pipe (its input) and
 * a prefault (its inner schema). Any other schema comes back as it is.
 */
function setAppearance(schema: z.ZodMiniType, appearance: z.ZodMiniType): z.ZodMiniType {
	if (isObjectSchema(schema)) return z.safeExtend(schema, { appearance });
	if (isPipeSchema(schema)) {
		const { in: input, out } = schema._zod.def;
		if (!isMiniSchema(input)) return schema;
		const next = setAppearance(input, appearance);
		return next === input ? schema : z.pipe(next, out);
	}
	if (isPrefaultSchema(schema)) {
		const { innerType, defaultValue } = schema._zod.def;
		if (!isMiniSchema(innerType)) return schema;
		const next = setAppearance(innerType, appearance);
		return next === innerType ? schema : z.prefault(next, defaultValue);
	}
	return schema;
}

function declaredAppearance(axes: AxisRegistry, supported: readonly string[]) {
	return z
		.optional(createAppearanceSchema(axes, supported))
		.check(z.describe('Named appearance values, one per declared axis'));
}

/**
 * Sets the `appearance` key of an object schema to the closed schema of the axes its owner
 * declares, for a JSON Schema export.
 *
 * @param supported The owner's declared axes (`appearanceAxes`); omit it for an owner that declares none,
 * which gets a closed object with no axes.
 *
 * @remarks
 * Validation strips an authored `appearance` before it parses the owner's own schema and checks the
 * pick against the declared axes (`checkAppearance`), on every owner whatever its schema says. So the
 * key is set whether or not the schema has one, and replaces an open one. This keeps the export from
 * drifting from validation. A pipe is rewritten on its input, so a transform after the object stays.
 * A schema that is not an object, a pipe of one or a prefault of one (a lazy schema, for example) is
 * returned unchanged. The result is for export only: parse with the original.
 */
export function withAppearanceAxes(
	schema: z.ZodMiniType,
	axes: AxisRegistry,
	supported: readonly string[] = [],
): z.ZodMiniType {
	return setAppearance(schema, declaredAppearance(axes, supported));
}

/**
 * Applies {@link withAppearanceAxes} to each slot of a recipe's view schema, with the axes the
 * recipe declares for that slot.
 *
 * @param slotAxes The recipe's `appearanceAxes`; a slot it does not list declares none.
 *
 * @remarks
 * Expects the shape `defineProtocolRecipeSpec` builds: a strict object whose slots are objects
 * wrapped in `prefault`. Validation resolves the appearance of every slot, so every slot gets the
 * key. Any other shape is returned unchanged.
 */
export function withSlotAppearanceAxes(
	schema: z.ZodMiniType,
	axes: AxisRegistry,
	slotAxes: Readonly<Record<string, readonly string[] | undefined>> = {},
): z.ZodMiniType {
	if (!isObjectSchema(schema)) return schema;
	const replaced: Record<string, z.ZodMiniType> = {};
	for (const [slot, slotSchema] of Object.entries(schema._zod.def.shape)) {
		if (!isMiniSchema(slotSchema)) continue;
		const next = withAppearanceAxes(slotSchema, axes, slotAxes[slot]);
		if (next !== slotSchema) replaced[slot] = next;
	}
	if (Object.keys(replaced).length === 0) return schema;
	return z.safeExtend(schema, replaced);
}

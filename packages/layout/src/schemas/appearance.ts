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
 * @remarks
 * Built for a JSON Schema export, so an editor autocompletes `appearance.size`. The enums are fresh
 * schemas rather than the axes' own, so the export inlines them instead of referencing a catalog
 * entry. Checking a pick against the axes an owner declares is {@link checkAppearance}'s job, not
 * this schema's.
 */
export function createAppearanceSchema(axes: AxisRegistry) {
	return z.strictObject(
		Object.fromEntries(
			axes
				.all()
				.map((axis) => [
					axis.$type,
					z
						.optional(z.enum(Object.keys(axis.values) as [string, ...string[]]))
						.check(z.describe(axis.metadata.description ?? axis.metadata.name)),
				]),
		),
	);
}

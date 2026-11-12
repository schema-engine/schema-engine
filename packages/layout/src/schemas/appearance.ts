import * as z from 'zod/mini';

/**
 * A pick of named appearance values, one per axis: `{ size: 'compact' }`.
 *
 * @remarks
 * The shape is open because the axes belong to the theme (`createLayoutTheme({ appearance })`). A
 * domain checks each axis and value against the theme's vocabulary and the owner's declared axes.
 */
export const AppearanceConfigSchema = z.record(z.string(), z.string());

export type AppearanceConfig = z.infer<typeof AppearanceConfigSchema>;

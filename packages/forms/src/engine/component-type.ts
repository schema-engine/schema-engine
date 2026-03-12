/**
 * Stable component kind identifiers shared across registries, builders, and
 * schema metadata.
 *
 * Keeping this outside `form-engine` prevents lower-level schema helpers from
 * depending on the runtime engine module, which keeps the extraction boundary
 * cleaner.
 */
export const ComponentType = {
	Element: 'element',
	Layout: 'layout',
	Stepper: 'stepper',
	Action: 'action',
} as const;

/**
 * Union of all supported component kind identifiers.
 */
export type ComponentType = (typeof ComponentType)[keyof typeof ComponentType];

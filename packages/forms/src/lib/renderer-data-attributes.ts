/**
 * Suffixes of the `data-se-*` attributes the form renderers already write, which an appearance axis cannot reuse.
 *
 * @remarks
 * The engine passes this list to the layout compiler as `reservedNames`, because
 * `getAppearanceAttributes` spreads after these on the same elements, so an axis named like one
 * would overwrite it. A test scans the renderer sources for `data-se-*` names, so a renderer that
 * adds an attribute fails it until the name is listed here.
 */
export const RENDERER_DATA_ATTRIBUTES = [
	'step',
	'theme',
	'theme-css',
	'constraint-field',
	'constraints',
	'base-required',
	'required',
	'row-id',
	'required-marker',
	'control',
] as const;

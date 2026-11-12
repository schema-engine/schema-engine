import * as z from 'zod/mini';
import { HtmlAttributesSchema } from './html-attributes';
import { ValidationRuleSchema } from './validation/';

/**
 * Inline style: CSS custom properties only, keyed `--name`, with string or number values.
 *
 * @remarks
 * Custom properties are the one style shape that means the same in every renderer: React reads
 * `style` as camelCase `CSSProperties` and Radiant as a plain record, so a named CSS property such as
 * `maxWidth` would render differently, and it could not be written portably in JSON or YAML.
 * Styling beyond custom properties goes through `className` or the form's `appearance`.
 *
 * A string value may not contain `;`, `{` or `}`: renderers write the value into a declaration, so
 * those characters would let one entry carry further declarations once the markup is server rendered.
 */
export const RendererStyleSchema = z.record(z.string(), z.union([z.string(), z.number()])).check(
	z.superRefine((style, ctx) => {
		for (const [key, value] of Object.entries(style)) {
			if (!key.startsWith('--')) {
				ctx.addIssue({
					code: 'custom',
					input: style,
					path: [key],
					message: `style accepts CSS custom properties only: '${key}' must start with '--'.`,
				});
			} else if (key.length === 2) {
				ctx.addIssue({
					code: 'custom',
					input: style,
					path: [key],
					message: `style accepts CSS custom properties only: the name after '--' must not be empty.`,
				});
			}
			if (typeof value === 'string' && /[;{}]/.test(value)) {
				ctx.addIssue({
					code: 'custom',
					input: style,
					path: [key],
					message: `style '${key}' must be a single value: it cannot contain ';', '{' or '}', which would start another declaration.`,
				});
			}
		}
	}),
);

export type RendererStyle = z.infer<typeof RendererStyleSchema>;

/**
 * A pick of named appearance values, one per axis: `{ size: 'compact' }`.
 *
 * @remarks
 * The shape is open because the axes belong to the engine (`createFormEngine({ appearance })`).
 * `validateForm` checks each axis and value against the engine's vocabulary and the element's declared
 * axes, and writes the resolved selection back.
 */
export const AppearanceConfigSchema = z.record(z.string(), z.string());

export type AppearanceConfig = z.infer<typeof AppearanceConfigSchema>;

/**
 * Constraint operands can be values from any registered field.
 * @remarks Their concrete types are selected by the form's element registrations.
 */
const ConstraintValueSchema = z.any();

/**
 * Semantic gap tokens for grid layouts.
 *
 * @remarks
 * Tokens are indirections to overridable CSS variables: the renderer emits
 * `var(--se-grid-gap-<token>)`, so hosts restyle every form by overriding the
 * token at `:root`. Raw CSS strings (e.g. `'1.5rem'`) are the one-off escape
 * hatch.
 */
export const GridGapTokens = ['none', 'compact', 'default', 'loose', 'wide'] as const;

export type GridGapToken = (typeof GridGapTokens)[number];

/**
 * Semantic gap token or a raw CSS length.
 *
 * @remarks
 * The enum branch is redundant for validation — the string branch accepts the
 * same values — and `z.infer` collapses the union to `string`. It is kept
 * because `z.toJSONSchema` emits it as `anyOf: [{enum: [...]}, {type: string}]`,
 * which is how the token vocabulary reaches registry and docs consumers.
 */
export const GridGapValueSchema = z
	.union([z.enum(GridGapTokens), z.string()])
	.check(z.describe('Semantic gap token (none | compact | default | loose | wide) or a raw CSS length.'));

/**
 * Words that are not valid grid area names: `grid-area` reads `auto` and `span`
 * as placement keywords, the CSS-wide keywords reset a declaration, and `none`
 * and `default` are excluded from a `<custom-ident>` by the CSS grammar.
 */
const RESERVED_AREA_NAMES = [
	'auto',
	'span',
	'none',
	'default',
	'inherit',
	'initial',
	'unset',
	'revert',
	'revert-layer',
];

/**
 * A word as a pattern that matches it in any letter case.
 *
 * @remarks
 * Spelled with character classes instead of an `i` flag because the JSON Schema
 * export keeps only a regex's source, so a flag would be lost and editors would
 * accept `AUTO` and reject `Street`.
 */
function anyCase(word: string): string {
	return word
		.split('')
		.map((char) => (/[a-z]/i.test(char) ? `[${char.toLowerCase()}${char.toUpperCase()}]` : char))
		.join('');
}

const AREA_NAME_SOURCE = `(?!(?:${RESERVED_AREA_NAMES.map(anyCase).join('|')})(?![\\w-]))-?[_a-zA-Z][_a-zA-Z0-9-]*`;

/**
 * Name of a grid area: an ASCII CSS identifier that is not a reserved word.
 *
 * @remarks
 * Names are written into a custom property that the stylesheet reads as CSS, so
 * the pattern is the injection guard. Nothing outside `[A-Za-z0-9_-]` can reach the
 * property, which rules out quotes, semicolons, braces and whitespace.
 */
const GridAreaNameSchema = z
	.string()
	.check(
		z.regex(new RegExp(`^${AREA_NAME_SOURCE}$`), 'Area names are CSS identifiers such as "header" or "side-2".'),
		z.describe('Name of a cell group in the grid template: a CSS identifier such as "header" or "side-2".'),
	);

/** A value per cascade slot (`default`, `sm` ... `2xl`), each optional. */
function perBreakpoint<T extends z.ZodMiniType>(schema: T) {
	return z.strictObject({
		default: z.optional(schema),
		sm: z.optional(schema),
		md: z.optional(schema),
		lg: z.optional(schema),
		xl: z.optional(schema),
		'2xl': z.optional(schema),
	});
}

function responsiveSchema<T extends z.ZodMiniType>(schema: T) {
	return z.optional(perBreakpoint(schema));
}

/** One row of a template: area names or `.` for an empty cell, separated by spaces. */
const GridAreaRowSchema = z
	.string()
	.check(
		z.regex(
			new RegExp(`^\\s*(?:\\.+|${AREA_NAME_SOURCE})(?:\\s+(?:\\.+|${AREA_NAME_SOURCE}))*\\s*$`),
			'A grid areas row lists area names (CSS identifiers) or "." for an empty cell, separated by spaces.',
		),
	);

const GridAreaRowsSchema = z.array(GridAreaRowSchema).check(z.minLength(1));

/**
 * A drawn layout: rows of area names, optionally per breakpoint.
 *
 * @remarks
 * The column count comes from the rows, so a grid with `areas` sets no
 * `columns`. Rows of one template must be the same length and each name must
 * fill a rectangle; `validateForm` checks both, as CSS drops a template that
 * breaks either.
 */
const GridAreasSchema = z
	.union([GridAreaRowsSchema, perBreakpoint(GridAreaRowsSchema)])
	.check(
		z.describe(
			'Rows of area names separated by spaces ("." is an empty cell), or a record of them per breakpoint (default, sm ... 2xl).',
		),
	);

const GridLayoutPropertiesSchema = z.strictObject({
	areas: z.optional(GridAreasSchema),
	columns: z.optional(z.union([z.number(), z.literal('auto')])),
	gap: z.optional(GridGapValueSchema),
	gapX: z.optional(GridGapValueSchema),
	gapY: z.optional(GridGapValueSchema),
	minColumnWidth: z.optional(z.string()),
	justifyItems: z.optional(z.enum(['start', 'end', 'center', 'stretch'])),
	alignItems: z.optional(z.enum(['start', 'end', 'center', 'stretch'])),
	placeItems: z.optional(z.string()),
	justifyContent: z.optional(
		z.enum(['start', 'end', 'center', 'stretch', 'space-around', 'space-between', 'space-evenly']),
	),
	alignContent: z.optional(
		z.enum(['start', 'end', 'center', 'stretch', 'space-around', 'space-between', 'space-evenly']),
	),
	placeContent: z.optional(z.string()),
});

export const GridBreakpointConfigSchema = z.pick(GridLayoutPropertiesSchema, {
	columns: true,
	gap: true,
	gapX: true,
	gapY: true,
	minColumnWidth: true,
});

export const GridLayoutConfigSchema = z.extend(GridLayoutPropertiesSchema, {
	responsive: responsiveSchema(GridBreakpointConfigSchema),
});

/**
 * Named field widths, as shares of the row.
 *
 * @remarks
 * A grid whose fields use `width` or `offset` is laid out on 12 tracks, so
 * every name is a whole number of tracks: `full` 12, `three-quarters` 9,
 * `two-thirds` 8, `half` 6, `third` 4, `quarter` 3. A field that sets no width
 * fills the row.
 */
export const GridWidthNames = ['full', 'three-quarters', 'two-thirds', 'half', 'third', 'quarter'] as const;

export type GridWidthName = (typeof GridWidthNames)[number];

/** Named offsets: the widths that are a fraction of the row, without `full`. */
export const GridOffsetNames = ['three-quarters', 'two-thirds', 'half', 'third', 'quarter'] as const;

export type GridOffsetName = (typeof GridOffsetNames)[number];

const ElementGridPropertiesSchema = z.strictObject({
	area: z
		.optional(GridAreaNameSchema)
		.check(z.describe('Name of the cell group this field fills in the grid areas template.')),
	width: z
		.optional(z.enum(GridWidthNames))
		.check(z.describe(`Named share of the row (${GridWidthNames.join(' | ')}).`)),
	offset: z
		.optional(z.enum(GridOffsetNames))
		.check(z.describe(`Named empty space before the field (${GridOffsetNames.join(' | ')}).`)),
	column: z.optional(z.union([z.number(), z.string()])),
	row: z.optional(z.union([z.number(), z.string()])),
	justifySelf: z.optional(z.enum(['start', 'end', 'center', 'stretch'])),
	alignSelf: z.optional(z.enum(['start', 'end', 'center', 'stretch'])),
	placeSelf: z.optional(z.string()),
	marginBlockStart: z
		.optional(GridGapValueSchema)
		.check(z.describe('Extra space before this element, on top of the grid row gap.')),
	marginBlockEnd: z
		.optional(GridGapValueSchema)
		.check(z.describe('Extra space after this element, on top of the grid row gap.')),
});

export const FieldGridBreakpointSchema = z.extend(z.omit(ElementGridPropertiesSchema, { placeSelf: true }), {
	hidden: z.optional(z.boolean()),
});

export const ElementGridConfigSchema = z.extend(ElementGridPropertiesSchema, {
	responsive: responsiveSchema(FieldGridBreakpointSchema),
});

/**
 * Constraint logic configuration schema
 */
export const ConstraintLogicSchema = z.object({
	field: z.string(),
	operator: z.enum([
		'equals',
		'not_equals',
		'contains',
		'not_contains',
		'greater_than',
		'less_than',
		'is_empty',
		'is_not_empty',
	]),
	value: ConstraintValueSchema,
	action: z.enum(['show', 'hide', 'enable', 'disable', 'require']),
});

/**
 * Base field configuration schema that all field types extend
 * This contains all common properties shared by all form fields
 */
export const BaseFieldSchema = z.object({
	name: z.string().check(z.describe('Form field name used for form submission')),
	id: z.optional(z.string()).check(z.describe('HTML element ID')),
	$type: z.string().check(z.describe('Field component identifier')),

	label: z.optional(z.string()).check(z.describe('Display label for the field')),
	description: z.optional(z.string()).check(z.describe('Help text or description')),
	placeholder: z.optional(z.string()).check(z.describe('Placeholder text')),

	disabled: z.optional(z.boolean()).check(z.describe('Whether the field is disabled')),
	readonly: z.optional(z.boolean()).check(z.describe('Whether the field is read-only')),
	/**
	 * Field values are element-specific and may be unconstrained in the shared schema.
	 * @remarks The registered element schema validates configuration; field-value rules validate submitted values.
	 */
	defaultValue: z.optional(z.any()).check(z.describe('Default value for the field')),

	rules: z.optional(z.array(ValidationRuleSchema)).check(z.describe('Validation rules')),

	className: z.optional(z.string()).check(z.describe('CSS class name')),
	style: z.optional(RendererStyleSchema).check(z.describe('CSS custom properties')),
	appearance: z.optional(AppearanceConfigSchema).check(z.describe('Named appearance values, one per axis')),
	htmlAttributes: z.optional(HtmlAttributesSchema),

	grid: z.optional(ElementGridConfigSchema).check(z.describe('Grid positioning configuration')),

	constraints: z.optional(z.array(z.lazy(() => ConstraintLogicSchema))).check(z.describe('Conditional logic rules')),
});

/**
 * Type definitions
 */
export type BaseField = z.infer<typeof BaseFieldSchema>;
export type BaseFieldInput = z.input<typeof BaseFieldSchema>;
export type GridBreakpointConfig = z.infer<typeof GridBreakpointConfigSchema>;
export type FieldGridBreakpointConfig = z.infer<typeof FieldGridBreakpointSchema>;
export type ElementGridConfig = z.infer<typeof ElementGridConfigSchema>;
export type GridLayoutConfig = z.infer<typeof GridLayoutConfigSchema>;
export type ConstraintLogic = z.infer<typeof ConstraintLogicSchema>;

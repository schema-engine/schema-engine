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
 */
export const RendererStyleSchema = z.record(z.string(), z.union([z.string(), z.number()])).check(
	z.superRefine((style, ctx) => {
		for (const key of Object.keys(style)) {
			if (!/^--./.test(key)) {
				ctx.addIssue({
					code: 'custom',
					input: style,
					path: [key],
					message: `style accepts CSS custom properties only: '${key}' must start with '--'.`,
				});
			}
		}
	}),
);

export type RendererStyle = z.infer<typeof RendererStyleSchema>;

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

const GridLayoutPropertiesSchema = z.strictObject({
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

function responsiveSchema<T extends z.ZodMiniType>(schema: T) {
	return z.optional(
		z.strictObject({
			default: z.optional(schema),
			sm: z.optional(schema),
			md: z.optional(schema),
			lg: z.optional(schema),
			xl: z.optional(schema),
			'2xl': z.optional(schema),
		}),
	);
}

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
	style: z.optional(RendererStyleSchema).check(z.describe('Inline styles')),
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

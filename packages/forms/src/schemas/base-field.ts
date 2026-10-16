import * as z from 'zod/mini';
import { HtmlAttributesSchema } from './html-attributes';
import { ValidationRuleSchema } from './validation/';

/**
 * Renderer style values vary across host adapters.
 * @remarks This existential value boundary keeps React, Radiant, and custom adapter style contracts open.
 */
const RendererStyleValueSchema = z.any();

export const RendererStyleSchema = z.record(z.string(), RendererStyleValueSchema);

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
 * Responsive breakpoint configuration for grid layout
 */
export const GridBreakpointConfigSchema = z.object({
	columns: z.optional(z.union([z.number(), z.literal('auto')])),
	rows: z
		.optional(z.union([z.number(), z.literal('auto')]))
		.check(z.describe('Deprecated: not emitted to grid CSS yet.')),
	gap: z.optional(GridGapValueSchema),
	gapX: z.optional(GridGapValueSchema),
	gapY: z.optional(GridGapValueSchema),
	minColumnWidth: z.optional(z.string()),
	maxColumnWidth: z.optional(z.string()).check(z.describe('Deprecated: not emitted to grid CSS yet.')),
});

/**
 * Field-level responsive breakpoint configuration
 */
export const FieldGridBreakpointSchema = z.object({
	column: z.optional(z.union([z.number(), z.string()])),
	row: z.optional(z.union([z.number(), z.string()])),
	justifySelf: z.optional(z.enum(['start', 'end', 'center', 'stretch'])),
	alignSelf: z.optional(z.enum(['start', 'end', 'center', 'stretch'])),
	hidden: z.optional(z.boolean()),
	marginBlockStart: z.optional(GridGapValueSchema),
	marginBlockEnd: z.optional(GridGapValueSchema),
});

/**
 * Grid layout configuration schema
 */
export const GridLayoutConfigSchema = z.object({
	columns: z.optional(z.union([z.number(), z.literal('auto')])),
	rows: z
		.optional(z.union([z.number(), z.literal('auto')]))
		.check(z.describe('Deprecated: not emitted to grid CSS yet.')),
	gap: z.optional(GridGapValueSchema),
	gapX: z.optional(GridGapValueSchema),
	gapY: z.optional(GridGapValueSchema),
	responsive: z.optional(
		z.object({
			default: z.optional(GridBreakpointConfigSchema),
			sm: z.optional(GridBreakpointConfigSchema),
			md: z.optional(GridBreakpointConfigSchema),
			lg: z.optional(GridBreakpointConfigSchema),
			xl: z.optional(GridBreakpointConfigSchema),
			'2xl': z.optional(GridBreakpointConfigSchema),
		}),
	),
	autoFit: z.optional(z.boolean()).check(z.describe('Deprecated: not emitted to grid CSS yet.')),
	autoFill: z.optional(z.boolean()).check(z.describe('Deprecated: not emitted to grid CSS yet.')),
	minColumnWidth: z.optional(z.string()),
	maxColumnWidth: z.optional(z.string()).check(z.describe('Deprecated: not emitted to grid CSS yet.')),
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

/**
 * Element grid configuration schema
 */
export const ElementGridConfigSchema = z.object({
	column: z.optional(z.union([z.number(), z.string()])),
	row: z.optional(z.union([z.number(), z.string()])),
	responsive: z.optional(
		z.object({
			default: z.optional(FieldGridBreakpointSchema),
			sm: z.optional(FieldGridBreakpointSchema),
			md: z.optional(FieldGridBreakpointSchema),
			lg: z.optional(FieldGridBreakpointSchema),
			xl: z.optional(FieldGridBreakpointSchema),
			'2xl': z.optional(FieldGridBreakpointSchema),
		}),
	),
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
export type GridBreakpointConfig = z.infer<typeof GridBreakpointConfigSchema>;
export type FieldGridBreakpointConfig = z.infer<typeof FieldGridBreakpointSchema>;
export type ElementGridConfig = z.infer<typeof ElementGridConfigSchema>;
export type GridLayoutConfig = z.infer<typeof GridLayoutConfigSchema>;
export type ConstraintLogic = z.infer<typeof ConstraintLogicSchema>;

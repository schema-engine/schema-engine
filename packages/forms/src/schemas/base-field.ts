import * as z from 'zod/mini';
import { HtmlAttributesSchema } from './html-attributes';
import { AppearanceConfigSchema, ElementGridConfigSchema } from '@schema-engine/layout';
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
 * Constraint operands can be values from any registered field.
 * @remarks Their concrete types are selected by the form's element registrations.
 */
const ConstraintValueSchema = z.any();

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
export type ConstraintLogic = z.infer<typeof ConstraintLogicSchema>;

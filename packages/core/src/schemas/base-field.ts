import { z } from 'zod';
import { ValidationRuleSchema } from './validation/';

/**
 * Responsive breakpoint configuration for grid layout
 */
export const GridBreakpointConfigSchema = z.object({
	columns: z.union([z.number(), z.literal('auto')]).optional(),
	rows: z.union([z.number(), z.literal('auto')]).optional(),
	gap: z.union([z.number(), z.string()]).optional(),
	minColumnWidth: z.string().optional(),
	maxColumnWidth: z.string().optional(),
});

/**
 * Field-level responsive breakpoint configuration
 */
export const FieldGridBreakpointSchema = z.object({
	column: z.union([z.number(), z.string()]).optional(),
	row: z.union([z.number(), z.string()]).optional(),
	justifySelf: z.enum(['start', 'end', 'center', 'stretch']).optional(),
	alignSelf: z.enum(['start', 'end', 'center', 'stretch']).optional(),
	hidden: z.boolean().optional(),
});

/**
 * Grid layout configuration schema
 */
export const GridLayoutConfigSchema = z.object({
	columns: z.union([z.number(), z.literal('auto')]).optional(),
	rows: z.union([z.number(), z.literal('auto')]).optional(),
	gap: z.union([z.number(), z.string()]).optional(),
	responsive: z
		.object({
			default: GridBreakpointConfigSchema.optional(),
			sm: GridBreakpointConfigSchema.optional(),
			md: GridBreakpointConfigSchema.optional(),
			lg: GridBreakpointConfigSchema.optional(),
			xl: GridBreakpointConfigSchema.optional(),
			'2xl': GridBreakpointConfigSchema.optional(),
		})
		.optional(),
	autoFit: z.boolean().optional(),
	autoFill: z.boolean().optional(),
	minColumnWidth: z.string().optional(),
	maxColumnWidth: z.string().optional(),
	justifyItems: z.enum(['start', 'end', 'center', 'stretch']).optional(),
	alignItems: z.enum(['start', 'end', 'center', 'stretch']).optional(),
	placeItems: z.string().optional(),
	justifyContent: z
		.enum(['start', 'end', 'center', 'stretch', 'space-around', 'space-between', 'space-evenly'])
		.optional(),
	alignContent: z
		.enum(['start', 'end', 'center', 'stretch', 'space-around', 'space-between', 'space-evenly'])
		.optional(),
	placeContent: z.string().optional(),
});

/**
 * Element grid configuration schema
 */
export const ElementGridConfigSchema = z.object({
	column: z.union([z.number(), z.string()]).optional(),
	row: z.union([z.number(), z.string()]).optional(),
	responsive: z
		.object({
			default: FieldGridBreakpointSchema.optional(),
			sm: FieldGridBreakpointSchema.optional(),
			md: FieldGridBreakpointSchema.optional(),
			lg: FieldGridBreakpointSchema.optional(),
			xl: FieldGridBreakpointSchema.optional(),
			'2xl': FieldGridBreakpointSchema.optional(),
		})
		.optional(),
	justifySelf: z.enum(['start', 'end', 'center', 'stretch']).optional(),
	alignSelf: z.enum(['start', 'end', 'center', 'stretch']).optional(),
	placeSelf: z.string().optional(),
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
	value: z.any(),
	action: z.enum(['show', 'hide', 'enable', 'disable', 'require']),
});

/**
 * Base field configuration schema that all field types extend
 * This contains all common properties shared by all form fields
 */
export const BaseFieldSchema = z.object({
	name: z.string().describe('Form field name used for form submission'),
	id: z.string().optional().describe('HTML element ID'),
	__id: z.string().describe('Field component identifier'),

	label: z.string().optional().describe('Display label for the field'),
	description: z.string().optional().describe('Help text or description'),
	placeholder: z.string().optional().describe('Placeholder text'),

	disabled: z.boolean().optional().describe('Whether the field is disabled'),
	readonly: z.boolean().optional().describe('Whether the field is read-only'),
	defaultValue: z.any().optional().describe('Default value for the field'),

	rules: z.array(ValidationRuleSchema).optional().describe('Validation rules'),

	className: z.string().optional().describe('CSS class name'),
	style: z.record(z.string(), z.any()).optional().describe('Inline styles'),

	grid: ElementGridConfigSchema.optional().describe('Grid positioning configuration'),

	constraints: z
		.array(z.lazy(() => ConstraintLogicSchema))
		.optional()
		.describe('Conditional logic rules'),
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

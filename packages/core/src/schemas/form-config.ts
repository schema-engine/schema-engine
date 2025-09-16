import { z } from 'zod';
import { FormActionConfigSchema, type FormActionConfig } from '../actions/types';
import type { FieldConfig } from './field-config';
import { GridLayoutConfigSchema, type ConstraintLogic } from './base-field';
import { ValidationRuleSchema } from './validation';

export type { FormActionConfig } from '../actions/types';

/**
 * Layout configuration schema
 */
export const LayoutConfigSchema = z.object({
	type: z.enum(['group', 'grid', 'tabs', 'accordion', 'collapsible']),
	title: z.string().optional(),
	description: z.string().optional(),
	columns: z.number().optional(),
	gap: z.number().optional(),
	className: z.string().optional(),
	constraints: z.array(z.any()).optional(), // Use any to avoid circular reference
});

/**
 * Step navigation button configuration schema
 */
export const StepNavigationButtonSchema = z.object({
	label: z.string(),
	variant: z.enum(['primary', 'secondary', 'outline', 'ghost']).optional(),
	className: z.string().optional(),
	disabled: z.boolean().optional(),
	hidden: z.boolean().optional(),
	constraints: z.array(z.any()).optional(), // Use any to avoid circular reference
	customHandler: z.string().optional(), // Function name or identifier for custom handlers
});

/**
 * Step navigation configuration schema
 */
export const StepNavigationConfigSchema = z.object({
	showStepNumbers: z.boolean().optional().default(true),
	showStepTitles: z.boolean().optional().default(true),
	orientation: z.enum(['horizontal', 'vertical']).optional().default('horizontal'),
	variant: z.enum(['default', 'pills', 'arrows', 'dots', 'minimal', 'compact']).optional().default('default'),
	position: z.enum(['top', 'bottom', 'left', 'right']).optional().default('top'),
	buttons: z
		.object({
			previous: StepNavigationButtonSchema.optional(),
			next: StepNavigationButtonSchema.optional(),
			submit: StepNavigationButtonSchema.optional(),
			custom: z.record(z.string(), StepNavigationButtonSchema).optional(),
		})
		.optional(),
	allowStepJumping: z.boolean().optional().default(false),
	validateOnNext: z.boolean().optional().default(true),
	className: z.string().optional(),
});

/**
 * Form step schema for multi-step forms - now contains fields directly
 */
export const FormStepSchema = z.object({
	id: z.string(),
	title: z.string(),
	description: z.string().optional(),
	icon: z.string().optional(),
	elements: z.array(z.any()), // Will be typed as FieldConfig[] but avoiding circular reference
	rules: z.any().optional(),
	constraints: z.array(z.any()).optional(), // Use any to avoid circular reference
	className: z.string().optional(),
	style: z.record(z.string(), z.any()).optional(),
	onStepEnter: z.array(FormActionConfigSchema).optional(), // Actions to run when entering step
	onStepLeave: z.array(FormActionConfigSchema).optional(), // Actions to run when leaving step
	onStepValidate: z.array(FormActionConfigSchema).optional(), // Actions to run for step validation
	actions: z.array(FormActionConfigSchema).optional(), // General step actions
});

/**
 * Complete form configuration schema
 */
export const FormConfigSchema = z.object({
	id: z.string(),
	title: z.string().optional(),
	description: z.string().optional(),
	steps: z.array(FormStepSchema),
	layout: z.array(LayoutConfigSchema).optional(),
	grid: z.lazy(() => GridLayoutConfigSchema).optional(),
	stepper: StepNavigationConfigSchema.optional(),
	mode: z.enum(['wizard', 'free']).optional().default('wizard'),
	validationMode: z.enum(['onSubmit', 'onChange', 'onBlur', 'all']).optional(),
	reValidateMode: z.enum(['onSubmit', 'onChange', 'onBlur']).optional(),
	rules: ValidationRuleSchema.array().optional(),
	className: z.string().optional(),
	style: z.record(z.string(), z.any()).optional(),
	actions: z.array(FormActionConfigSchema).optional(),
});

/**
 * Inferred types from schemas
 */
export type LayoutConfig = z.infer<typeof LayoutConfigSchema>;
export type StepNavigationButton = z.infer<typeof StepNavigationButtonSchema>;
export type StepNavigationConfig = z.infer<typeof StepNavigationConfigSchema>;

/**
 * Form step configuration type
 * We define this with proper FieldConfig typing to avoid circular references
 */
export interface FormStep {
	id: string;
	title: string;
	description?: string;
	icon?: string;
	elements: FieldConfig[];
	rules?: any;
	constraints?: ConstraintLogic[];
	className?: string;
	style?: Record<string, any>;
	onStepEnter?: FormActionConfig[];
	onStepLeave?: FormActionConfig[];
	onStepValidate?: FormActionConfig[];
	actions?: FormActionConfig[];
}

export type FormConfig = z.infer<typeof FormConfigSchema> & {
	onSubmit?: (data: any) => void | Promise<void>;
	onChange?: (data: any) => void;
};

/**
 * Stepper variant options
 */
export type StepperVariant = 'default' | 'minimal' | 'compact';

/**
 * Stepper orientation options
 */
export type StepperOrientation = 'horizontal' | 'vertical';

/**
 * Stepper validation mode options
 */
export type StepperValidationMode = 'wizard' | 'free';

/**
 * Handler types for custom stepper functionality
 */
export interface StepHandlers {
	onStepEnter?: (stepId: string, stepIndex: number, formData: any) => void | Promise<void>;
	onStepLeave?: (stepId: string, stepIndex: number, formData: any) => boolean | Promise<boolean>;
	onStepValidate?: (stepId: string, stepIndex: number, formData: any) => boolean | Promise<boolean>;
	customNavigationHandlers?: Record<
		string,
		(stepId: string, stepIndex: number, formData: any) => void | Promise<void>
	>;
}

/**
 * Stepper context data
 */
export interface StepperContextData {
	currentStep: number;
	totalSteps: number;
	steps: FormStep[];
	isFirstStep: boolean;
	isLastStep: boolean;
	canGoNext: boolean;
	canGoPrevious: boolean;
	goToStep: (step: number) => void | Promise<void>;
	goToNext: () => void | Promise<void>;
	goToPrevious: () => void | Promise<void>;
	validateCurrentStep: () => boolean | Promise<boolean>;
	getStepData: (stepIndex?: number) => any;
	handlers?: StepHandlers;
	validationMode?: StepperValidationMode;
}

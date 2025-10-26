import { z } from 'zod';
import { FormActionConfigSchema } from '../actions/types';
import { GridLayoutConfigSchema } from './base-field';

export type { FormActionConfig } from '../actions/types';

/**
 * Step layout configuration schema
 *
 * Base schema for step-specific layout configurations. Layout components define their own
 * extended schemas with specific configuration options.
 *
 * @example
 * ```ts
 * const MyLayoutConfigSchema = StepLayoutConfigSchema.extend({
 *   $type: z.literal('my-layout'),
 *   columns: z.number(),
 *   gap: z.string()
 * });
 * ```
 */
export const StepLayoutConfigSchema = z.looseObject({
	$type: z.string(),
});

/**
 * Form stepper configuration schema
 *
 * Base schema for stepper configurations. Each stepper component registers its own
 * extended schema with specific configuration options via module augmentation.
 *
 * @example
 * ```ts
 * const MyStepperConfigSchema = BaseStepperConfigSchema.extend({
 *   $type: z.literal('my-stepper'),
 *   orientation: z.enum(['horizontal', 'vertical'])
 * });
 * ```
 */
export const FormStepperConfigSchema = z.looseObject({
	$type: z.string(),
});

/**
 * Form step schema for multi-step forms - now contains fields directly
 */
export const FormStepSchema = z.object({
	id: z.string(),
	title: z.string(),
	description: z.string().optional(),
	icon: z.string().optional(),
	layout: StepLayoutConfigSchema.optional(),
	elements: z.array(z.any()),
	rules: z.any().optional(),
	constraints: z.array(z.any()).optional(),
	className: z.string().optional(),
	style: z.record(z.string(), z.any()).optional(),
	onStepEnter: z.array(FormActionConfigSchema).optional(),
	onStepLeave: z.array(FormActionConfigSchema).optional(),
	onStepValidate: z.array(FormActionConfigSchema).optional(),
	actions: z.array(FormActionConfigSchema).optional(),
});

/**
 * Complete form configuration schema
 */
export const FormConfigSchema = z.object({
	id: z.string(),
	title: z.string().optional(),
	description: z.string().optional(),
	steps: z.array(FormStepSchema),
	stepper: FormStepperConfigSchema.optional(),
	grid: z.lazy(() => GridLayoutConfigSchema).optional(),
	mode: z.enum(['wizard', 'free']).optional().default('wizard'),
	validationMode: z.enum(['onSubmit', 'onChange', 'onBlur', 'all']).optional(),
	reValidateMode: z.enum(['onSubmit', 'onChange', 'onBlur']).optional(),
	className: z.string().optional(),
	style: z.record(z.string(), z.any()).optional(),
	actions: z.array(FormActionConfigSchema).optional(),
});

/**
 * Inferred types from schemas
 */
export type StepLayoutConfig = z.infer<typeof StepLayoutConfigSchema>;
export type FormStepperConfig = z.infer<typeof FormStepperConfigSchema>;

/**
 * Form step configuration type with properly typed elements and layout arrays.
 *
 * The Zod schema uses z.any() for elements and z.looseObject() for layout to avoid circular references,
 * but we override them here to provide strict type checking for field configurations.
 */
export type FormStep = Omit<z.infer<typeof FormStepSchema>, 'elements' | 'layout'> & {
	elements: Array<FormEngine.ElementConfig>;
	layout?: FormEngine.LayoutConfig;
};

/**
 * Form configuration type with strict typing for steps and stepper.
 * Includes additional properties not in the Zod schema for runtime handlers.
 */
export type FormConfig = Omit<z.infer<typeof FormConfigSchema>, 'steps' | 'stepper'> & {
	steps: Array<FormStep>;
	stepper?: FormEngine.StepperConfig;
	onSubmit?: (data: any) => void | Promise<void>;
	onChange?: (data: any) => void;
};

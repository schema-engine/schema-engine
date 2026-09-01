import { z } from 'zod';
import { FormActionConfigSchema } from '../actions/types';
import { GridLayoutConfigSchema } from './base-field';

export type { FormActionConfig } from '../actions/types';

/**
 * Form view configuration schema.
 *
 * Recipe registrations extend this with slot-specific keys (shell, header, progress, actions).
 */
export const FormViewConfigSchema = z.looseObject({
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
	view: FormViewConfigSchema.optional(),
	grid: z.lazy(() => GridLayoutConfigSchema).optional(),
	validationMode: z.enum(['onSubmit', 'onChange', 'onBlur', 'all']).optional(),
	reValidateMode: z.enum(['onSubmit', 'onChange', 'onBlur']).optional(),
	className: z.string().optional(),
	style: z.record(z.string(), z.any()).optional(),
	actions: z.array(FormActionConfigSchema).optional(),
});

/**
 * Inferred types from schemas
 */
export type FormViewConfig = z.infer<typeof FormViewConfigSchema>;

/**
 * Form step configuration type with properly typed elements.
 */
export type FormStep = Omit<z.infer<typeof FormStepSchema>, 'elements'> & {
	elements: Array<FormEngine.ElementConfig>;
};

/**
 * Form configuration type with strict typing for steps and view.
 * Includes additional properties not in the Zod schema for runtime handlers.
 */
export type FormConfig = Omit<z.infer<typeof FormConfigSchema>, 'steps' | 'view'> & {
	steps: Array<FormStep>;
	view?: FormEngine.ViewConfig;
	onSubmit?: (data: any) => void | Promise<void>;
	onChange?: (data: any) => void;
};

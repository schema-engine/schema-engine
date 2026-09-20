import * as z from 'zod/mini';
import { FormActionConfigSchema } from '../actions/types';
import { createFormConfigShape, createFormStepSchema, TypedConfigEnvelopeSchema } from './form-config-shape';

import type { FormActionConfig } from '../actions/types';

export type { FormActionConfig } from '../actions/types';
export { TypedConfigEnvelopeSchema } from './form-config-shape';

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
export const FormStepSchema = createFormStepSchema({
	elements: z.any(),
	actions: FormActionConfigSchema,
});

/**
 * Complete form configuration schema
 */
export const FormConfigSchema = createFormConfigShape({
	elements: z.any(),
	view: FormViewConfigSchema,
	actions: FormActionConfigSchema,
});

/**
 * Envelope used by runtime validation: identity and `$type` tags only.
 * Element, recipe, and action payloads are validated separately via Standard Schema.
 */
export const formConfigEnvelopeSchema = createFormConfigShape({
	elements: TypedConfigEnvelopeSchema,
	view: FormViewConfigSchema,
	actions: TypedConfigEnvelopeSchema,
});

/**
 * Inferred types from schemas
 */
export type FormViewConfig = z.infer<typeof FormViewConfigSchema>;

/**
 * Runtime tagged config used inside the validation pipeline before narrowing.
 */
export type FormTaggedConfig = { $type: string } & Record<string, unknown>;

export type FormConfigEnvelope = Omit<z.infer<typeof formConfigEnvelopeSchema>, 'steps' | 'view' | 'actions'> & {
	steps: Array<
		Omit<
			z.infer<typeof FormStepSchema>,
			'elements' | 'actions' | 'onStepEnter' | 'onStepLeave' | 'onStepValidate'
		> & {
			elements: FormTaggedConfig[];
			actions?: FormTaggedConfig[];
			onStepEnter?: FormTaggedConfig[];
			onStepLeave?: FormTaggedConfig[];
			onStepValidate?: FormTaggedConfig[];
		}
	>;
	view?: FormViewConfig;
	actions?: FormTaggedConfig[];
};

/**
 * Form step configuration type with properly typed elements.
 */
export type FormStep = Omit<
	z.infer<typeof FormStepSchema>,
	'elements' | 'actions' | 'onStepEnter' | 'onStepLeave' | 'onStepValidate'
> & {
	elements: FormTaggedConfig[];
	actions?: Array<FormActionConfig>;
	onStepEnter?: Array<FormActionConfig>;
	onStepLeave?: Array<FormActionConfig>;
	onStepValidate?: Array<FormActionConfig>;
};

/**
 * Form configuration type with strict typing for steps and view.
 * Includes additional properties not in the base schema for runtime handlers.
 */
export type FormConfig = Omit<z.infer<typeof FormConfigSchema>, 'steps' | 'view' | 'actions'> & {
	steps: Array<FormStep>;
	view?: FormViewConfig;
	actions?: Array<FormActionConfig>;
	onSubmit?: (data: Record<string, unknown>) => void | Promise<void>;
	onChange?: (data: Record<string, unknown>) => void;
};

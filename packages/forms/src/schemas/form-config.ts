import * as z from 'zod/mini';
import { FormActionConfigSchema, type FormActionConfig } from '../actions/types';
import { createFormConfigShape, createFormStepSchema, TypedConfigEnvelopeSchema } from './form-config-shape';
import type { ElementConfig } from './field-config';

export type { FormActionConfig } from '../actions/types';
export { TypedConfigEnvelopeSchema } from './form-config-shape';

/** Form view config for an engine's recipe map. */
export type FormViewConfig<TRecipes extends Record<string, unknown> = Record<string, unknown>> =
	string extends keyof TRecipes
		? z.infer<typeof FormViewConfigSchema>
		: [keyof TRecipes] extends [never]
			? never
			: {
					[K in keyof TRecipes & string]: { readonly $type: K } & TRecipes[K] & {
							[key: string]: unknown;
						};
				}[keyof TRecipes & string];

/**
 * Form view configuration schema.
 *
 * Recipe registrations extend this with slot-specific keys (shell, header,
 * progress, actions).
 */
export const FormViewConfigSchema = z.looseObject({
	$type: z.string(),
});

/** Form step schema for multi-step forms - now contains fields directly. */
export const FormStepSchema = createFormStepSchema({
	elements: z.any(),
	actions: FormActionConfigSchema,
});

/** Complete form configuration schema. */
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

/** Inferred view config from the runtime schema. */
export type FormViewConfigSchemaOutput = z.infer<typeof FormViewConfigSchema>;

/** Runtime tagged config used inside the validation pipeline before narrowing. */
export type FormTaggedConfig = { $type: string } & Record<string, unknown>;

type InferredStep = z.infer<typeof FormStepSchema>;
type InferredForm = z.infer<typeof FormConfigSchema>;

export type FormConfigEnvelope = Omit<InferredForm, 'steps' | 'view' | 'actions'> & {
	steps: Array<
		Omit<InferredStep, 'elements' | 'actions' | 'onStepEnter' | 'onStepLeave' | 'onStepValidate'> & {
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

/** Form step config narrowed to the element and action maps of one engine. */
export type FormStep<
	TElements extends Record<string, unknown> = Record<string, unknown>,
	TActions extends Record<string, unknown> = Record<string, unknown>,
> = Omit<InferredStep, 'elements' | 'actions' | 'onStepEnter' | 'onStepLeave' | 'onStepValidate'> & {
	elements: Array<ElementConfig<TElements>>;
	actions?: Array<FormActionConfig<TActions>>;
	onStepEnter?: Array<FormActionConfig<TActions>>;
	onStepLeave?: Array<FormActionConfig<TActions>>;
	onStepValidate?: Array<FormActionConfig<TActions>>;
};

/** Form config narrowed to one engine's registered elements, recipes, and actions. */
export type FormConfig<
	TElements extends Record<string, unknown> = Record<string, unknown>,
	TRecipes extends Record<string, unknown> = Record<string, unknown>,
	TActions extends Record<string, unknown> = Record<string, unknown>,
> = Omit<InferredForm, 'steps' | 'view' | 'actions'> & {
	steps: Array<FormStep<TElements, TActions>>;
	view?: FormViewConfig<TRecipes>;
	actions?: Array<FormActionConfig<TActions>>;
	onSubmit?: (data: Record<string, unknown>) => void | Promise<void>;
	onChange?: (data: Record<string, unknown>) => void;
};

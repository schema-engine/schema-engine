import * as z from 'zod/mini';
import type { FormActionConfig } from '../actions/types';
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
	/**
	 * Element payloads are an existential boundary.
	 * @remarks The owning engine selects and validates their types by `$type`.
	 */
	elements: z.any(),
	actions: TypedConfigEnvelopeSchema,
});

/** Complete form configuration schema. */
export const FormConfigSchema = createFormConfigShape({
	/**
	 * Element payloads are an existential boundary.
	 * @remarks The owning engine selects and validates their types by `$type`.
	 */
	elements: z.any(),
	view: FormViewConfigSchema,
	actions: TypedConfigEnvelopeSchema,
});

/**
 * Envelope used by runtime validation: identity and `$type` tags only.
 * Element, recipe, and action payloads are validated separately via Standard Schema.
 *
 * @remarks
 * A step's elements and the actions of the form and its steps are left as they arrived (`z.unknown()`): the registry's
 * tree walk narrows the elements from the authored value, so a cycle is reported at its first repeat, and
 * `parseActions` narrows each action. An element or an action without a `$type` is that entry's issue and not one of
 * the envelope that stops every deeper check.
 */
export const formConfigEnvelopeSchema = createFormConfigShape({
	elements: z.unknown(),
	view: FormViewConfigSchema,
	actions: z.unknown(),
});

/** Inferred view config from the runtime schema. */
export type FormViewConfigSchemaOutput = z.infer<typeof FormViewConfigSchema>;

/** Runtime tagged config used inside the validation pipeline before narrowing. */
export type FormTaggedConfig = { $type: string } & Record<string, unknown>;

type InferredStep = z.infer<typeof FormStepSchema>;
type InferredForm = z.infer<typeof FormConfigSchema>;

export type FormConfigEnvelope = Omit<InferredForm, 'steps' | 'view' | 'actions'> & {
	steps: Array<
		Omit<InferredStep, 'elements' | 'actions'> & {
			elements: unknown[];
			actions?: unknown[];
		}
	>;
	view?: FormViewConfig;
	actions?: unknown[];
};

/** Form step config narrowed to the element and action maps of one engine. */
export type FormStep<
	TElements extends Record<string, unknown> = Record<string, unknown>,
	TActions extends Record<string, unknown> = Record<string, unknown>,
> = Omit<InferredStep, 'elements' | 'actions'> & {
	elements: Array<ElementConfig<TElements>>;
	/** Actions dispatched after the form's actions on every trigger while this step is current. */
	actions?: Array<FormActionConfig<TActions> | FormActionConfig<TActions>[]>;
};

/**
 * The settings a form config carries with defaults: authors may leave them out, and normalization fills
 * `validationMode` with `'onSubmit'`, `reValidateMode` with `'onChange'` and `navigation` with `'linear'`,
 * so a normalized config always has all three.
 */
export type FormValidationModes = Pick<InferredForm, 'validationMode' | 'reValidateMode' | 'navigation'>;

/** Form config narrowed to one engine's registered elements, recipes, and actions. */
export type FormConfig<
	TElements extends Record<string, unknown> = Record<string, unknown>,
	TRecipes extends Record<string, unknown> = Record<string, unknown>,
	TActions extends Record<string, unknown> = Record<string, unknown>,
> = Omit<InferredForm, 'steps' | 'view' | 'actions' | keyof FormValidationModes> &
	Partial<FormValidationModes> & {
		steps: Array<FormStep<TElements, TActions>>;
		view?: FormViewConfig<TRecipes>;
		actions?: Array<FormActionConfig<TActions> | FormActionConfig<TActions>[]>;
	};

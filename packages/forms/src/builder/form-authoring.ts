import type { GridLayoutConfig } from '@/schemas/base-field';

/**
 * Discriminated union of `{ $type }` plus the registered config for each key.
 * An empty map yields `never`, so unregistered slots cannot be authored.
 */
export type DiscriminatedConfigs<TMap extends Record<string, unknown>> = string extends keyof TMap
	? never
	: [keyof TMap] extends [never]
		? never
		: {
				[K in keyof TMap]: { readonly $type: K } & TMap[K];
			}[keyof TMap];

export type FormAuthoringAction<TActions extends Record<string, unknown>> = DiscriminatedConfigs<TActions>;

/**
 * Recursively rewrite container `elements` to this engine's authoring union.
 * Nested fieldsets and arrays use the same registrations as top-level fields.
 */
type WithEngineChildren<TConfig, TElements extends Record<string, unknown>> = TConfig extends {
	elements: unknown[];
}
	? Omit<TConfig, 'elements'> & { elements: Array<AuthoringElement<TElements>> }
	: TConfig extends { elements?: unknown[] }
		? Omit<TConfig, 'elements'> & { elements?: Array<AuthoringElement<TElements>> }
		: TConfig;

export type AuthoringElement<TElements extends Record<string, unknown>> = string extends keyof TElements
	? never
	: [keyof TElements] extends [never]
		? never
		: {
				[K in keyof TElements]: { readonly $type: K } & WithEngineChildren<TElements[K], TElements>;
			}[keyof TElements];

export type FormAuthoringStep<
	TElements extends Record<string, unknown> = Record<never, unknown>,
	TActions extends Record<string, unknown> = Record<never, unknown>,
> = {
	id: string;
	title: string;
	description?: string;
	icon?: string;
	elements: Array<AuthoringElement<TElements>>;
	rules?: unknown;
	constraints?: unknown[];
	className?: string;
	style?: Record<string, unknown>;
	onStepEnter?: Array<FormAuthoringAction<TActions>>;
	onStepLeave?: Array<FormAuthoringAction<TActions>>;
	onStepValidate?: Array<FormAuthoringAction<TActions>>;
	actions?: Array<FormAuthoringAction<TActions>>;
};

/**
 * Typed form authoring input for an engine's registered elements, recipes, and actions.
 * Pass this to {@link FormEngine.defineForm}. External JSON uses {@link FormEngine.validateForm}.
 * Both return a frozen `NormalizedFormConfig`, not this authoring shape.
 *
 * Nested container `elements` are typed from the same engine registrations as
 * top-level fields.
 */
export interface FormAuthoringInput<
	TElements extends Record<string, unknown> = Record<never, unknown>,
	TRecipes extends Record<string, unknown> = Record<never, unknown>,
	TActions extends Record<string, unknown> = Record<never, unknown>,
> {
	id: string;
	title?: string;
	description?: string;
	steps: Array<FormAuthoringStep<TElements, TActions>>;
	view?: DiscriminatedConfigs<TRecipes>;
	grid?: GridLayoutConfig;
	/**
	 * When a field validates before the form is submitted.
	 *
	 * @remarks Both renderers honour it. Unset, React validates on blur and Radiant on submit.
	 */
	validationMode?: 'onSubmit' | 'onChange' | 'onBlur' | 'all';
	/** When a field re-validates after a submit; unset, on change in both renderers. */
	reValidateMode?: 'onSubmit' | 'onChange' | 'onBlur';
	className?: string;
	style?: Record<string, unknown>;
	actions?: Array<FormAuthoringAction<TActions>>;
	onSubmit?: (data: Record<string, unknown>) => void | Promise<void>;
	onChange?: (data: Record<string, unknown>) => void;
}

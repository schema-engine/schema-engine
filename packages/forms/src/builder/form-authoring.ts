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

export type FormAuthoringAction<TActions extends Record<string, unknown>> = [keyof TActions] extends [never]
	? never
	: TActions[keyof TActions];

export interface FormAuthoringStep<
	TElements extends Record<string, unknown> = Record<never, unknown>,
	TActions extends Record<string, unknown> = Record<never, unknown>,
> {
	id: string;
	title: string;
	description?: string;
	icon?: string;
	elements: Array<DiscriminatedConfigs<TElements>>;
	rules?: unknown;
	constraints?: unknown[];
	className?: string;
	style?: Record<string, unknown>;
	onStepEnter?: Array<FormAuthoringAction<TActions>>;
	onStepLeave?: Array<FormAuthoringAction<TActions>>;
	onStepValidate?: Array<FormAuthoringAction<TActions>>;
	actions?: Array<FormAuthoringAction<TActions>>;
}

/**
 * Typed form authoring input for an engine's registered elements, recipes, and actions.
 * Pass this to {@link FormEngine.defineForm}. External JSON uses {@link FormEngine.validateForm}.
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
	validationMode?: 'onSubmit' | 'onChange' | 'onBlur' | 'all';
	reValidateMode?: 'onSubmit' | 'onChange' | 'onBlur';
	className?: string;
	style?: Record<string, unknown>;
	actions?: Array<FormAuthoringAction<TActions>>;
	onSubmit?: (data: any) => void | Promise<void>;
	onChange?: (data: any) => void;
}

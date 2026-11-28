import type { AppearanceInput, GridLayoutConfig } from '@schema-engine/layout';
import type { ActionConfigBase } from '@schema-engine/actions';
import type { StepConstraint } from '../schemas/base-field.js';
import type { ActionArguments } from '../types/registration.js';

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

/**
 * Rejects `view` keys, and keys inside each slot, that the selected recipe does not declare.
 *
 * @remarks
 * `defineForm` infers its config through a generic constraint, which skips excess property
 * checks. This maps undeclared keys to `never` so a misspelled or undeclared slot, or an
 * unknown key inside a slot, is a type error. Exactness stops at the slot's own keys: objects
 * nested deeper inside a slot config are not checked.
 */
export type ExactViewConfig<
	TView,
	TRecipes extends Record<string, unknown>,
	TAppearance extends Record<string, string> = Record<string, string>,
> = TView extends {
	readonly $type: infer K;
}
	? ExactSlots<TView, Extract<DiscriminatedConfigs<TRecipes>, { readonly $type: K }>, TAppearance>
	: TView;

type ExactSlots<TView, TDeclared, TAppearance extends Record<string, string>> = {
	[P in keyof TView]: P extends keyof TDeclared
		? P extends '$type'
			? TView[P]
			: ExactSlot<TView[P], NonNullable<TDeclared[P]>, TAppearance>
		: never;
};

/**
 * An `appearance` pick is held to the engine's axes and values: an undeclared axis or value maps to `never`.
 *
 * @remarks
 * Needed because `defineForm` infers its config through a generic constraint, which allows extra
 * keys: `{ size: 'compact', density: 'high' }` satisfies a weak type with an optional `size`.
 */
export type ExactAppearance<TPick, TAppearance extends Record<string, string>> = {
	[A in keyof TPick]: A extends keyof TAppearance ? Extract<TPick[A], TAppearance[A]> : never;
};

type ExactElementList<TElements, TAppearance extends Record<string, string>> = TElements extends readonly unknown[]
	? { [I in keyof TElements]: ExactElement<TElements[I], TAppearance> }
	: TElements;

type ExactElement<TElement, TAppearance extends Record<string, string>> = TElement extends object
	? {
			[K in keyof TElement]: K extends 'appearance'
				? ExactAppearance<TElement[K], TAppearance>
				: K extends 'elements'
					? ExactElementList<TElement[K], TAppearance>
					: TElement[K];
		}
	: TElement;

type ExactSteps<TSteps, TAppearance extends Record<string, string>> = TSteps extends readonly unknown[]
	? {
			[I in keyof TSteps]: TSteps[I] extends object
				? {
						[K in keyof TSteps[I]]: K extends 'appearance'
							? ExactAppearance<TSteps[I][K], TAppearance>
							: K extends 'elements'
								? ExactElementList<TSteps[I][K], TAppearance>
								: TSteps[I][K];
					}
				: TSteps[I];
		}
	: TSteps;

/**
 * Holds the form's, every step's and every element's `appearance` to the engine's axes and values.
 */
export type ExactFormAppearance<
	TConfig extends { appearance?: unknown; steps?: unknown },
	TAppearance extends Record<string, string>,
> = {
	appearance?: ExactAppearance<TConfig['appearance'], TAppearance>;
	steps?: ExactSteps<TConfig['steps'], TAppearance>;
};

type ExactSlot<TSlot, TDeclared, TAppearance extends Record<string, string>> = TSlot extends
	readonly unknown[] | ((...args: never[]) => unknown)
	? TSlot
	: TSlot extends object
		? {
				[Q in keyof TSlot]: Q extends 'appearance'
					? ExactAppearance<TSlot[Q], TAppearance>
					: Q extends keyof TDeclared
						? ExactSlot<TSlot[Q], NonNullable<TDeclared[Q]>, TAppearance>
						: never;
			}
		: TSlot;

/**
 * An action as an author writes it: the keys the engine owns plus the arguments its registration's schema lists.
 *
 * @remarks An empty map yields `never`, like {@link DiscriminatedConfigs}.
 */
export type FormAuthoringAction<TActions extends Record<string, unknown>> = string extends keyof TActions
	? never
	: [keyof TActions] extends [never]
		? never
		: {
				[K in keyof TActions & string]: ActionConfigBase<K> & ActionArguments<TActions[K]>;
			}[keyof TActions & string];

/**
 * Recursively rewrite container `elements` to this engine's authoring union.
 * Nested fieldsets and arrays use the same registrations as top-level fields.
 */
type WithEngineChildren<
	TConfig,
	TElements extends Record<string, unknown>,
	TAppearance extends Record<string, string>,
> = TConfig extends {
	elements: unknown[];
}
	? Omit<TConfig, 'elements'> & { elements: Array<AuthoringElement<TElements, TAppearance>> }
	: TConfig extends { elements?: unknown[] }
		? Omit<TConfig, 'elements'> & { elements?: Array<AuthoringElement<TElements, TAppearance>> }
		: TConfig;

/**
 * Authoring union of an engine's elements. `appearance` is the engine's declared axes and values,
 * narrowed from the schema's open `Record<string, string>`.
 */
export type AuthoringElement<
	TElements extends Record<string, unknown>,
	TAppearance extends Record<string, string> = Record<string, string>,
> = string extends keyof TElements
	? never
	: [keyof TElements] extends [never]
		? never
		: {
				[K in keyof TElements]: { readonly $type: K } & Omit<
					WithEngineChildren<TElements[K], TElements, TAppearance>,
					'appearance'
				> & { appearance?: AppearanceInput<TAppearance> };
			}[keyof TElements];

export type FormAuthoringStep<
	TElements extends Record<string, unknown> = Record<never, unknown>,
	TActions extends Record<string, unknown> = Record<never, unknown>,
	TAppearance extends Record<string, string> = Record<string, string>,
> = {
	id: string;
	title: string;
	description?: string;
	icon?: string;
	elements: Array<AuthoringElement<TElements, TAppearance>>;
	/** Show or hide constraints on fields of earlier steps; a step they hide is skipped. */
	constraints?: StepConstraint[];
	className?: string;
	style?: Record<string, string | number>;
	appearance?: AppearanceInput<TAppearance>;
	/** Actions dispatched after the form's actions on every trigger while this step is current. */
	actions?: Array<FormAuthoringAction<TActions> | FormAuthoringAction<TActions>[]>;
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
	TAppearance extends Record<string, string> = Record<string, string>,
> {
	id: string;
	title?: string;
	description?: string;
	steps: Array<FormAuthoringStep<TElements, TActions, TAppearance>>;
	view?: DiscriminatedConfigs<TRecipes>;
	grid?: GridLayoutConfig;
	/**
	 * When a field validates before a check of it has failed: on `change`, on `blur`, on both (`all`), on the
	 * first `blur` and every change after it (`onTouched`) or only on an explicit check.
	 *
	 * @remarks Normalization fills it with `'onSubmit'` when unset, so a normalized form always has it and both renderers agree.
	 */
	validationMode?: 'onSubmit' | 'onChange' | 'onBlur' | 'onTouched' | 'all';
	/**
	 * When a field validates again once an explicit check of it has run, whether that check passed or failed.
	 *
	 * @remarks Normalization fills it with `'onChange'` when unset.
	 */
	reValidateMode?: 'onSubmit' | 'onChange' | 'onBlur';
	/**
	 * How freely the stepper moves forward: `'linear'` reaches only visited steps and validates the steps on the way,
	 * `'free'` reaches any active step without validating.
	 *
	 * @remarks Normalization fills it with `'linear'` when unset. Back is always allowed and `next()` validates in both.
	 */
	navigation?: 'linear' | 'free';
	/**
	 * Serializable data that always travels with a submission, such as ids or context.
	 *
	 * @remarks
	 * Merged into `submission.values`. It is never rendered, never a value of the form and never validated, and a
	 * key cannot name a field of the form or be a reserved segment: the config is rejected when it does.
	 */
	payload?: Record<string, unknown>;
	className?: string;
	style?: Record<string, string | number>;
	appearance?: AppearanceInput<TAppearance>;
	actions?: Array<FormAuthoringAction<TActions> | FormAuthoringAction<TActions>[]>;
}

import type { AuthoringElement } from '../builder/form-authoring.js';
import type { FormViewConfig } from './form-config.js';
import type { BaseFieldInput } from './base-field.js';

/** Open field config used by helpers that do not receive an engine type. */
export type UnregisteredElementConfig = BaseFieldInput & {
	[key: string]: unknown;
	elements?: UnregisteredElementConfig[];
};

/**
 * Element configs accepted by a particular engine.
 *
 * @remarks
 * The open default supports utilities that receive configs without an engine.
 * A concrete registration map narrows `$type` and each schema's input shape.
 */
export type ElementConfig<TElements extends Record<string, unknown> = Record<string, unknown>> =
	string extends keyof TElements
		? UnregisteredElementConfig
		: AuthoringElement<TElements> & BaseFieldInput & { [key: string]: unknown };

export type ElementId<TElements extends Record<string, unknown> = Record<string, unknown>> =
	keyof TElements extends never ? string : keyof TElements & string;

export type GetElementConfig<
	TType extends ElementId<TElements>,
	TElements extends Record<string, unknown> = Record<string, unknown>,
> = string extends keyof TElements
	? UnregisteredElementConfig & { $type: TType }
	: Extract<ElementConfig<TElements>, { $type: TType }>;

/** Form view config when no concrete recipe map is available. */
export type ViewConfig = { $type: string } & { [key: string]: unknown };

export type RecipeId<TRecipes extends Record<string, unknown> = Record<string, unknown>> = keyof TRecipes & string;

export type GetViewConfig<
	TType extends RecipeId<TRecipes>,
	TRecipes extends Record<string, unknown> = Record<string, unknown>,
> = string extends keyof TRecipes ? ViewConfig & { $type: TType } : Extract<FormViewConfig<TRecipes>, { $type: TType }>;

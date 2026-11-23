import type { AnyActionRegistration, AnyElementRegistration, AnyRecipeRegistration } from '@/types/registration';
import type { LayoutTheme } from '@schema-engine/layout';

export type ElementRegistration = AnyElementRegistration;

export interface ValidateFormOptions {
	/** Engine (or other owner) that produced this validation. Required to skip re-validation. */
	owner: object;
	getRecipe: (id: string) => AnyRecipeRegistration | undefined;
	/** `view.$type` written for a multi-step form that omits `view`. Defaults to `DEFAULT_WIZARD_RECIPE`. */
	defaultWizardRecipe?: string;
	getElement: (id: string) => ElementRegistration | undefined;
	getAction: (id: string) => AnyActionRegistration | undefined;
	/** Why a rule cannot be used (no handler, invalid options, a handler that throws), or `undefined` when it can. */
	checkRule: (rule: { type: string }) => string | undefined;
	/** Appearance axes the picks are checked against. Defaults to the built-in `size` and `surface` axes. */
	axes?: LayoutTheme['axes'];
}

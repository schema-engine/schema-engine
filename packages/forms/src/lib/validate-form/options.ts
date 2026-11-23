import type { AnyActionRegistration, AnyElementRegistration, AnyRecipeRegistration } from '@/types/registration';
import type { LayoutTheme } from '@schema-engine/layout';
import type { StandardSchemaV1 } from '@standard-schema/spec';
import type { RuleCheck } from '@/schemas/validation';

export type ElementRegistration = AnyElementRegistration;

export interface ValidateFormOptions {
	/** Engine (or other owner) that produced this validation. Required to skip re-validation. */
	owner: object;
	getRecipe: (id: string) => AnyRecipeRegistration | undefined;
	/** `view.$type` written for a multi-step form that omits `view`. Defaults to `DEFAULT_WIZARD_RECIPE`. */
	defaultWizardRecipe?: string;
	getElement: (id: string) => ElementRegistration | undefined;
	getAction: (id: string) => AnyActionRegistration | undefined;
	/** Checks a rule of an element against its registration; the engine passes its validation registry's `check`. */
	checkRule: (rule: { $type: string }) => RuleCheck;
	/** Appearance axes the picks are checked against. Defaults to the built-in `size` and `surface` axes. */
	axes?: LayoutTheme['axes'];
	/** The application's schema of the submitted values, which the normalized form carries for the runtime to parse with. */
	values?: StandardSchemaV1;
}

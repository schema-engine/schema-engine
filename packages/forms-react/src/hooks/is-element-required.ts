import { type ValidationRegistry, getValidationRulesForElement, isFieldRequired } from '@schema-engine/forms';

/** The parts of an element its required flag is derived from. */
export type RequiredFlagSource = Parameters<typeof getValidationRulesForElement>[0];

/** Base required flag before constraints: authored rules plus the type's default rules. */
export function isElementRequired(element: RequiredFlagSource, registry: ValidationRegistry): boolean {
	return isFieldRequired(getValidationRulesForElement(element, registry));
}

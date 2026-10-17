import type { ValidationRegistry } from '@schema-engine/forms/schemas/validation';
import { getValidationRulesForElement, isFieldRequired } from '@schema-engine/forms/schemas/validation/utils';

/** The parts of an element its required flag is derived from. */
export type RequiredFlagSource = Parameters<typeof getValidationRulesForElement>[0];

/** Base required flag before constraints: authored rules plus the type's default rules. */
export function isElementRequired(element: RequiredFlagSource, registry: ValidationRegistry): boolean {
	return isFieldRequired(getValidationRulesForElement(element, registry));
}

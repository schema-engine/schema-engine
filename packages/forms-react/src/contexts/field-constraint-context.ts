import { createContext } from 'react';
import { getValidationRulesForElement, isFieldRequired } from '@schema-engine/forms/schemas/validation/utils';
import type { ValidationRegistry } from '@schema-engine/forms/schemas/validation';
import type { UseConstraintLogicResult } from '@/hooks/use-constraint-logic';

export interface FieldConstraints {
	fieldPath: string;
	constraints: UseConstraintLogicResult;
}

/**
 * Constraint result `FormElement` evaluated for the field it renders.
 *
 * @remarks
 * `useControlledFormElement` reads `isRequired` from here instead of watching
 * the same constraint paths again. It is keyed by field path, so a control a
 * component binds to another name still evaluates its own constraints.
 */
export const FieldConstraintContext = createContext<FieldConstraints | null>(null);

/** Base required flag before constraints: authored rules plus the type's default rules. */
export function isElementRequired(
	element: Parameters<typeof getValidationRulesForElement>[0],
	registry: ValidationRegistry,
): boolean {
	return isFieldRequired(getValidationRulesForElement(element, registry));
}

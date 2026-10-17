import type { FormFieldElement } from '@/elements/form-field';
import type { FieldRules } from '@ecopages/radiant-ui/form';
import type { ValidationRule } from '@schema-engine/forms/schemas';
import { toFieldRules } from '@/lib/field-rules';
import { resolveFormEngine } from '@/contexts/resolve-form-engine';

/**
 * The parts of a rendered `se-field` that rule hydration and constraint sync use.
 *
 * @remarks
 * Structural, so unit tests can pass an `se-field` whose element is not defined.
 */
export type FieldRulesHost = HTMLElement & { name?: string; rules?: FieldRules; onRulesUpdated?: () => void };

/**
 * The field's rendered path, which cross-field references resolve against.
 *
 * @remarks
 * The attribute is read before the property because Radiant can apply client
 * properties after connect, and hydration runs on connect.
 */
function readFieldName(field: FieldRulesHost): string | undefined {
	return field.getAttribute('name') ?? field.name;
}

/**
 * @remarks
 * Serialized rules cannot carry validator functions. Preserve live validators,
 * a single function or a record of them, when markup hydration runs again
 * after client properties have been applied.
 */
export function readHydratedRules(field: FieldRulesHost): FieldRules | undefined {
	const currentRules = field.rules;
	if (currentRules && typeof currentRules === 'object' && currentRules.validate) {
		return undefined;
	}

	const validationRules = field.getAttribute('data-se-validation-rules');
	if (validationRules) {
		try {
			return toFieldRules(
				{
					rules: JSON.parse(validationRules) as ValidationRule[],
					name: readFieldName(field),
				},
				resolveFormEngine(field)?.getValidationRegistry(),
			);
		} catch {
			return undefined;
		}
	}

	return undefined;
}

export function hydrateFieldRules(root: ParentNode): void {
	for (const field of root.querySelectorAll<FormFieldElement>('se-field[data-se-validation-rules]')) {
		const rules = readHydratedRules(field);
		if (rules) {
			field.rules = rules;
			field.onRulesUpdated();
		}
	}
}

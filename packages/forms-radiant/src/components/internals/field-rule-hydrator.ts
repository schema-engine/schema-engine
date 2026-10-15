import type { FieldRules } from '@ecopages/radiant-ui/form';
import type { ValidationRule } from '@schema-engine/forms/schemas';
import { toFieldRules } from '@/lib/field-rules';
import { resolveFormEngine } from '@/contexts/resolve-form-engine';

/**
 * The field's rendered path, which cross-field references resolve against.
 *
 * @remarks
 * The attribute is read before the property because Radiant can apply client
 * properties after connect, and hydration runs on connect.
 */
function readFieldName(field: HTMLElement): string | undefined {
	return field.getAttribute('name') ?? (Reflect.get(field, 'name') as string | undefined);
}

/**
 * @remarks
 * Serialized rules cannot carry validator functions. Preserve live validators
 * when markup hydration runs again after client properties have been applied.
 */
export function readHydratedRules(field: HTMLElement): FieldRules | undefined {
	const currentRules: unknown = Reflect.get(field, 'rules');
	if (
		currentRules &&
		typeof currentRules === 'object' &&
		typeof Reflect.get(currentRules, 'validate') === 'function'
	) {
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
	for (const field of root.querySelectorAll<HTMLElement>('se-field[data-se-validation-rules]')) {
		const rules = readHydratedRules(field);
		if (rules) {
			Reflect.set(field, 'rules', rules);
			(field as HTMLElement & { connectToForm?: () => void }).connectToForm?.();
		}
	}
}

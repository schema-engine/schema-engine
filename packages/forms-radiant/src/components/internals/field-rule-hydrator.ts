import type { FieldRules } from '@ecopages/radiant-ui/form';
import type { ValidationRule } from '@schema-engine/forms/schemas';
import { toFieldRules } from '@/lib/field-rules';

type SerializedPattern = {
	$type: 'regexp';
	source: string;
	flags: string;
};

function isSerializedPattern(value: unknown): value is SerializedPattern {
	return (
		typeof value === 'object' &&
		value !== null &&
		Reflect.get(value, '$type') === 'regexp' &&
		typeof Reflect.get(value, 'source') === 'string' &&
		typeof Reflect.get(value, 'flags') === 'string'
	);
}

export function reviveRules(value: string | null): FieldRules | undefined {
	if (!value) {
		return undefined;
	}

	try {
		return JSON.parse(value, (_key, nestedValue: unknown) =>
			isSerializedPattern(nestedValue) ? new RegExp(nestedValue.source, nestedValue.flags) : nestedValue,
		) as FieldRules;
	} catch {
		return undefined;
	}
}

export function hydrateFieldRules(root: ParentNode): void {
	const fields = root.querySelectorAll<HTMLElement>('rui-field[data-se-field-rules]');
	for (const field of fields) {
		const validationRules = field.getAttribute('data-se-validation-rules');
		const rules = validationRules
			? toFieldRules(JSON.parse(validationRules) as ValidationRule[])
			: reviveRules(field.getAttribute('data-se-field-rules'));
		if (rules) {
			Reflect.set(field, 'rules', rules);
			(field as { connectToForm?: () => void }).connectToForm?.();
		}
	}
}

if (typeof document !== 'undefined') {
	hydrateFieldRules(document);
	document.addEventListener('eco:after-swap', () => hydrateFieldRules(document));
}

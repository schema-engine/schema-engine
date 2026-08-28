import type { FieldRules } from '@ecopages/radiant-ui/form';
import type { ValidationRule } from '@schema-engine/forms/schemas';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function numericRule(value: number, message?: string) {
	return message ? { value, message } : value;
}

export function toFieldRules(rules?: ValidationRule[]): FieldRules | undefined {
	if (!rules?.length) {
		return undefined;
	}

	const fieldRules: FieldRules = {};

	for (const rule of rules) {
		switch (rule.type) {
			case 'required':
				fieldRules.required = rule.message ?? true;
				break;
			case 'minLength':
				fieldRules.minLength = numericRule(rule.value, rule.message);
				break;
			case 'maxLength':
				fieldRules.maxLength = numericRule(rule.value, rule.message);
				break;
			case 'min':
				fieldRules.min = numericRule(rule.value, rule.message);
				break;
			case 'max':
				fieldRules.max = numericRule(rule.value, rule.message);
				break;
			case 'pattern':
				fieldRules.pattern = { value: new RegExp(rule.value), message: rule.message ?? 'Invalid format' };
				break;
			case 'email':
				fieldRules.pattern = {
					value: rule.pattern ? new RegExp(rule.pattern) : EMAIL_PATTERN,
					message: rule.message ?? 'Invalid email',
				};
				break;
			case 'minItems':
				if (rule.value >= 1) {
					fieldRules.required = rule.message ?? true;
				}
				break;
			default:
				break;
		}
	}

	return fieldRules;
}

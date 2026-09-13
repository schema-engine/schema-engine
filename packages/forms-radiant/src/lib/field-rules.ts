import type { FieldRules } from '@ecopages/radiant-ui/form';
import * as z from 'zod/mini';
import type { ValidationRule } from '@schema-engine/forms/schemas';
import { createZodSchemaFromRules, getValidationRulesForElement } from '@schema-engine/forms/schemas/validation/utils';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const BASE64_PATTERN = /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/;
const HEX_PATTERN = /^[0-9A-Fa-f]*$/;

const NATIVE_RUI_RULES = new Set([
	'required',
	'minLength',
	'maxLength',
	'min',
	'max',
	'pattern',
	'email',
	'base64',
	'hex',
	'minItems',
]);

function numericRule(value: number, message?: string) {
	return message ? { value, message } : value;
}

export function toFieldRules(rules?: ReadonlyArray<ValidationRule>, fieldType?: string): FieldRules | undefined {
	const resolved = getValidationRulesForElement<ValidationRule>({ $type: fieldType, rules });
	if (!resolved?.length) {
		return undefined;
	}

	const fieldRules: FieldRules = {};

	for (const rule of resolved) {
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
			case 'base64':
				fieldRules.pattern = { value: BASE64_PATTERN, message: rule.message ?? 'Invalid Base64' };
				break;
			case 'hex':
				fieldRules.pattern = { value: HEX_PATTERN, message: rule.message ?? 'Invalid hexadecimal value' };
				break;
			case 'phone': {
				const schema = createZodSchemaFromRules([rule]);
				fieldRules.validate = async (value) => {
					const result = await z.safeParseAsync(schema, value);
					return result.success || result.error.issues[0]?.message || 'Enter a complete phone number';
				};
				break;
			}
			case 'minItems':
				if (rule.value >= 1) {
					fieldRules.required = rule.message ?? true;
				}
				break;
			default:
				break;
		}
	}

	if (resolved.some((rule) => !NATIVE_RUI_RULES.has(rule.type))) {
		fieldRules.validate = async (value) => {
			const result = await z.safeParseAsync(createZodSchemaFromRules(resolved), value);
			return result.success || result.error.issues[0]?.message || 'Validation failed';
		};
	}

	return fieldRules;
}

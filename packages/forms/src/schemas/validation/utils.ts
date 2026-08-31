import { z } from 'zod';
import type { ValidationRule, BaseValidationRule, PhoneRule } from './types.js';
import type { BaseField } from '../base-field.js';
import { validationRegistry } from './validation-registry.js';

type ValidationRuleType = ValidationRule | BaseValidationRule;

interface ValidationElement {
	$type?: string;
	name?: string;
	rules?: ValidationRuleType[];
}

interface FieldConfigElement extends BaseField {
	id: string;
}

type FormElement = ValidationElement | FieldConfigElement;

export function isFieldRequired(rules?: ValidationRule[]): boolean {
	return rules?.some((rule) => rule.type === 'required') ?? false;
}

/**
 * Returns an element's configured rules plus validation intrinsic to its field type.
 *
 * Phone inputs accept partially typed values while editing, but a submitted non-empty
 * value must be a complete phone number. The explicit rule is preserved so callers can
 * customize its error message.
 */
export function getValidationRulesForElement<TRule extends BaseValidationRule>(element: {
	$type?: string;
	rules?: TRule[];
}): Array<TRule | PhoneRule> | undefined {
	const rules = element.rules;
	if (element.$type !== 'phone-input' || rules?.some((rule) => rule.type === 'phone')) {
		return rules;
	}

	return [...(rules ?? []), { type: 'phone' }];
}

export function createZodSchemaFromRules(
	rules: ValidationRuleType[] = [],
	formData?: Record<string, any>,
): z.ZodTypeAny {
	if (!rules.length) {
		return z.any();
	}

	const schemas: z.ZodTypeAny[] = [];
	for (const rule of rules) {
		const ruleSchema = validationRegistry.createSchema(rule as ValidationRule, formData);
		if (ruleSchema) {
			schemas.push(ruleSchema);
		}
	}

	if (schemas.length === 0) {
		return z.any();
	}

	let combinedSchema = schemas[0];
	for (let i = 1; i < schemas.length; i++) {
		combinedSchema = combinedSchema.and(schemas[i]);
	}

	return combinedSchema;
}

export function generateFormSchema(elements: FormElement[]): z.ZodObject<any> {
	const schemaFields: Record<string, z.ZodTypeAny> = {};

	for (const element of elements) {
		if (!element.name) continue;

		const rules = getValidationRulesForElement(element);
		if (!rules?.length) continue;

		const fieldSchema = createZodSchemaFromRules(rules, undefined);
		schemaFields[element.name] = fieldSchema;
	}

	return z.object(schemaFields);
}

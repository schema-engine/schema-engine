import { z } from 'zod';
import type { ValidationRule, BaseValidationRule } from './types.js';
import type { BaseField } from '../base-field.js';
import { validationRegistry } from './validation-registry.js';

type ValidationRuleType = ValidationRule | BaseValidationRule;

interface ValidationElement {
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

export function createZodSchemaFromRules(
	rules: ValidationRuleType[] = [],
	formData?: Record<string, any>,
	fieldName?: string,
): z.ZodTypeAny {
	if (!rules.length) {
		return z.any();
	}

	const schemas: z.ZodTypeAny[] = [];
	for (const rule of rules) {
		const ruleSchema = validationRegistry.createSchema(rule as ValidationRule, formData, fieldName);
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

		let rules: ValidationRuleType[] | undefined;
		if ('id' in element) {
			rules = (element as FieldConfigElement).rules;
		} else {
			rules = (element as ValidationElement).rules;
		}

		if (!rules?.length) continue;

		const fieldSchema = createZodSchemaFromRules(rules, undefined, element.name);
		schemaFields[element.name] = fieldSchema;
	}

	return z.object(schemaFields);
}

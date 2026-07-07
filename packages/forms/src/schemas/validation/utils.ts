import { z } from 'zod';
import type { StandardSchemaV1 } from '@standard-schema/spec';
import type { ValidationRule, BaseValidationRule } from './types.js';
import {
	createStandardFormDataSchema,
	type FormValidationElement,
} from './standard-schema-rules.js';
import { validationRegistry } from './validation-registry.js';

export type { FormValidationElement } from './standard-schema-rules.js';
export { createStandardSchemaFromRules, createStandardFormDataSchema } from './standard-schema-rules.js';

type ValidationRuleType = ValidationRule | BaseValidationRule;

export function isFieldRequired(rules?: ValidationRule[]): boolean {
	return rules?.some((rule) => rule.type === 'required') ?? false;
}

export function createZodSchemaFromRules(
	rules: ValidationRuleType[] = [],
	formData?: Record<string, unknown>,
): z.ZodTypeAny {
	if (!rules.length) {
		return z.any();
	}

	const schemas: z.ZodTypeAny[] = [];
	for (const rule of rules) {
		const ruleSchema = validationRegistry.createSchema(rule as ValidationRule, formData);
		if (ruleSchema) {
			schemas.push(ruleSchema as z.ZodTypeAny);
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

export function generateFormSchema(elements: FormValidationElement[]): z.ZodObject<any> {
	const schemaFields: Record<string, z.ZodTypeAny> = {};

	for (const element of elements) {
		if (!element.name || !element.rules?.length) {
			continue;
		}

		schemaFields[element.name] = createZodSchemaFromRules(element.rules);
	}

	return z.object(schemaFields);
}

export function buildFormDataValidator(
	config: { steps: Array<{ elements: FormValidationElement[] }> },
	formData?: Record<string, unknown>,
): StandardSchemaV1<Record<string, unknown>> {
	return createStandardFormDataSchema(
		config.steps.flatMap((step) => step.elements),
		formData,
	);
}

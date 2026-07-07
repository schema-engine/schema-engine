import type { StandardSchemaV1 } from '@standard-schema/spec';
import {
	createAndStandardSchema,
	createAnyStandardSchema,
	safeParseStandardSchema,
} from '@/lib/standard-schema';
import { createObjectSchema } from '@/schemas/standard-schema-composer';
import type { BaseField } from '../base-field.js';
import type { ValidationRule, BaseValidationRule } from './types.js';
import { validationRegistry } from './validation-registry.js';

type ValidationRuleType = ValidationRule | BaseValidationRule;

export interface ValidationElement {
	name?: string;
	rules?: ValidationRuleType[];
}

export type FormValidationElement = ValidationElement | (BaseField & { id: string });

export function createStandardSchemaFromRules(
	rules: ValidationRuleType[] = [],
	formData?: Record<string, unknown>,
): StandardSchemaV1 {
	if (!rules.length) {
		return createAnyStandardSchema();
	}

	const schemas: StandardSchemaV1[] = [];
	for (const rule of rules) {
		const ruleSchema = validationRegistry.createSchema(rule as ValidationRule, formData);
		if (ruleSchema) {
			schemas.push(ruleSchema);
		}
	}

	if (schemas.length === 0) {
		return createAnyStandardSchema();
	}

	return createAndStandardSchema(schemas);
}

export function createStandardFormDataSchema(
	elements: FormValidationElement[],
	formData?: Record<string, unknown>,
): StandardSchemaV1<Record<string, unknown>> {
	const fields: Array<{ key: string; schema: StandardSchemaV1 }> = [];

	for (const element of elements) {
		if (!element.name || !element.rules?.length) {
			continue;
		}

		fields.push({
			key: element.name,
			schema: createStandardSchemaFromRules(element.rules, formData),
		});
	}

	if (fields.length === 0) {
		return createAnyStandardSchema() as StandardSchemaV1<Record<string, unknown>>;
	}

	return createObjectSchema(fields) as StandardSchemaV1<Record<string, unknown>>;
}

export function collectValidationElementsFromSteps(
	steps: Array<{ elements: FormValidationElement[] }>,
): FormValidationElement[] {
	return steps.flatMap((step) => step.elements);
}

export function validateFormDataWithStandardSchema(
	schema: StandardSchemaV1<Record<string, unknown>>,
	data: unknown,
) {
	return safeParseStandardSchema(schema, data);
}

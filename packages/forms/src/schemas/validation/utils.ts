import * as z from 'zod/mini';
import type { ValidationRule, BaseValidationRule } from './types.js';
import type { BaseField } from '../base-field.js';
import { validationRegistry } from './validation-registry.js';
import { walkLeafFields } from '@/lib/field-scope.js';

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

export type ValidatableField = {
	path: string;
	rules: ReadonlyArray<BaseValidationRule>;
};

export function isFieldRequired(rules?: ReadonlyArray<{ readonly type: string }>): boolean {
	return rules?.some((rule) => rule.type === 'required') ?? false;
}

/**
 * Configured rules plus any `defaultFor` rules registered for the field `$type`.
 *
 * @remarks Default rules are stored as `{ type }` and asserted as `TRule` because
 * every validation rule in the union is identified by `type` alone.
 */
export function getValidationRulesForElement<TRule extends BaseValidationRule>(element: {
	$type?: string;
	rules?: readonly TRule[];
}): ReadonlyArray<TRule> | undefined {
	const configured = element.rules;
	const defaults = element.$type ? validationRegistry.getDefaultRulesForFieldType(element.$type) : [];
	if (defaults.length === 0) {
		return configured;
	}

	const merged: TRule[] = [...(configured ?? [])];
	for (const rule of defaults) {
		if (!merged.some((existing) => existing.type === rule.type)) {
			merged.push(rule as TRule);
		}
	}

	return merged;
}

/**
 * Leaf fields with validation rules, using composed paths (`address.street`).
 * Array indices are expanded later against live values.
 */
export function collectValidatableFields(elements: readonly object[], basePath = ''): ValidatableField[] {
	const fields: ValidatableField[] = [];

	for (const { path, element } of walkLeafFields(elements, basePath)) {
		const rules = getValidationRulesForElement(
			element as { $type?: string; rules?: ReadonlyArray<BaseValidationRule> },
		);
		if (rules?.length) {
			fields.push({ path, rules });
		}
	}

	return fields;
}

export function createZodSchemaFromRules(
	rules: ReadonlyArray<ValidationRuleType> = [],
	formData?: Record<string, any>,
): z.ZodMiniType {
	if (!rules.length) {
		return z.any();
	}

	const schemas: z.ZodMiniType[] = [];
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
		combinedSchema = z.intersection(combinedSchema, schemas[i]);
	}

	return combinedSchema;
}

export function generateFormSchema(elements: FormElement[]): z.ZodMiniObject<any> {
	const schemaFields: Record<string, z.ZodMiniType> = {};

	for (const element of elements) {
		if (!element.name) continue;

		const rules = getValidationRulesForElement(element);
		if (!rules?.length) continue;

		const fieldSchema = createZodSchemaFromRules(rules, undefined);
		schemaFields[element.name] = fieldSchema;
	}

	return z.object(schemaFields);
}

import type { FieldRules } from '@ecopages/radiant-ui/form';
import * as z from 'zod/mini';
import type { ValidationRule } from '@schema-engine/forms/schemas';
import type { ValidationRegistry } from '@schema-engine/forms/schemas/validation';
import { createDebounceScope } from '@schema-engine/forms/lib/debounce';
import {
	createValidationContext,
	createZodSchemaFromRules,
	getValidationRulesForElement,
} from '@schema-engine/forms/schemas/validation/utils';
import { peekOwningFormEngine } from '@/contexts/form-engine-owner';
import { expandValues } from '@/adapters/radiant/controller/values';

const NATIVE_RUI_RULES = new Set(['required', 'minLength', 'maxLength', 'min', 'max', 'pattern']);

function numericRule(value: number, message?: string) {
	return message ? { value, message } : value;
}

/**
 * The rendered element a rule set belongs to.
 *
 * @remarks
 * `name` is the *rendered* path (`contacts.0.email`), which array rows overlay
 * onto the authored config. Cross-field references are resolved against it, so
 * passing the authored name instead would scope every row's references to row 0.
 */
export interface FieldRulesSource {
	rules?: ReadonlyArray<ValidationRule>;
	$type?: string;
	name?: string;
}

/**
 * Builds a Radiant UI validator that rebuilds its schema on every call.
 *
 * @remarks
 * The schema cannot be built once and reused: a cross-field rule reads the
 * form's current values through its context, so a schema is only correct for the
 * invocation whose context produced it. Radiant UI hands `validate` the form's
 * flat values, which are expanded into the engine's nested tree first.
 */
function resolveValidationRegistry(registry?: ValidationRegistry): ValidationRegistry | undefined {
	return registry ?? peekOwningFormEngine()?.getValidationRegistry();
}

function toValidator(
	rules: ReadonlyArray<ValidationRule>,
	fieldPath: string | undefined,
	fallbackMessage: string,
	registry: ValidationRegistry,
) {
	const debounceScope = createDebounceScope();
	return async (value: unknown, values: Record<string, unknown>) => {
		const context = createValidationContext({ values: expandValues(values ?? {}), fieldPath, debounceScope });
		const result = await z.safeParseAsync(createZodSchemaFromRules(rules, context, registry), value);
		return result.success || result.error.issues[0]?.message || fallbackMessage;
	};
}

export function toFieldRules(element: FieldRulesSource, registry?: ValidationRegistry): FieldRules | undefined {
	const resolvedRegistry = resolveValidationRegistry(registry);
	const resolved = resolvedRegistry
		? getValidationRulesForElement<ValidationRule>(element, resolvedRegistry)
		: element.rules;
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
			default:
				break;
		}
	}

	if (resolvedRegistry && resolved.some((rule) => !NATIVE_RUI_RULES.has(rule.type))) {
		fieldRules.validate = toValidator(resolved, element.name, 'Validation failed', resolvedRegistry);
	}

	return fieldRules;
}

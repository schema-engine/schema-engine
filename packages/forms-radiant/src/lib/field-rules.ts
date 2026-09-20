import type { FieldRules } from '@ecopages/radiant-ui/form';
import * as z from 'zod/mini';
import type { ValidationRule } from '@schema-engine/forms/schemas';
import {
	createValidationContext,
	createZodSchemaFromRules,
	getValidationRulesForElement,
} from '@schema-engine/forms/schemas/validation/utils';
import { expandValues } from '@/adapters/radiant/controller/values';

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
function toValidator(rules: ReadonlyArray<ValidationRule>, fieldPath: string | undefined, fallbackMessage: string) {
	return async (value: unknown, values: Record<string, unknown>) => {
		const context = createValidationContext({ values: expandValues(values ?? {}), fieldPath });
		const result = await z.safeParseAsync(createZodSchemaFromRules(rules, context), value);
		return result.success || result.error.issues[0]?.message || fallbackMessage;
	};
}

type NativeRule = Extract<ValidationRule, { type: keyof typeof NATIVE_RULE_APPLIERS }>;

const NATIVE_RULE_APPLIERS = {
	required: (fieldRules: FieldRules, rule: Extract<ValidationRule, { type: 'required' }>) => {
		fieldRules.required = rule.message ?? true;
	},
	minLength: (fieldRules: FieldRules, rule: Extract<ValidationRule, { type: 'minLength' }>) => {
		fieldRules.minLength = numericRule(rule.value, rule.message);
	},
	maxLength: (fieldRules: FieldRules, rule: Extract<ValidationRule, { type: 'maxLength' }>) => {
		fieldRules.maxLength = numericRule(rule.value, rule.message);
	},
	min: (fieldRules: FieldRules, rule: Extract<ValidationRule, { type: 'min' }>) => {
		fieldRules.min = numericRule(rule.value, rule.message);
	},
	max: (fieldRules: FieldRules, rule: Extract<ValidationRule, { type: 'max' }>) => {
		fieldRules.max = numericRule(rule.value, rule.message);
	},
	pattern: (fieldRules: FieldRules, rule: Extract<ValidationRule, { type: 'pattern' }>) => {
		fieldRules.pattern = { value: new RegExp(rule.value), message: rule.message ?? 'Invalid format' };
	},
	email: (fieldRules: FieldRules, rule: Extract<ValidationRule, { type: 'email' }>) => {
		fieldRules.pattern = {
			value: rule.pattern ? new RegExp(rule.pattern) : EMAIL_PATTERN,
			message: rule.message ?? 'Invalid email',
		};
	},
	base64: (fieldRules: FieldRules, rule: Extract<ValidationRule, { type: 'base64' }>) => {
		fieldRules.pattern = { value: BASE64_PATTERN, message: rule.message ?? 'Invalid Base64' };
	},
	hex: (fieldRules: FieldRules, rule: Extract<ValidationRule, { type: 'hex' }>) => {
		fieldRules.pattern = { value: HEX_PATTERN, message: rule.message ?? 'Invalid hexadecimal value' };
	},
	minItems: (fieldRules: FieldRules, rule: Extract<ValidationRule, { type: 'minItems' }>) => {
		if (rule.value >= 1) {
			fieldRules.required = rule.message ?? true;
		}
	},
} satisfies Record<string, (fieldRules: FieldRules, rule: ValidationRule) => void>;

function applyNativeFieldRule(fieldRules: FieldRules, rule: ValidationRule, element: FieldRulesSource): void {
	if (rule.type === 'phone') {
		fieldRules.validate = toValidator([rule], element.name, 'Enter a complete phone number');
		return;
	}
	const apply = NATIVE_RULE_APPLIERS[rule.type as keyof typeof NATIVE_RULE_APPLIERS];
	if (apply) {
		apply(fieldRules, rule as NativeRule);
	}
}

export function toFieldRules(element: FieldRulesSource): FieldRules | undefined {
	const resolved = getValidationRulesForElement<ValidationRule>(element);
	if (!resolved?.length) {
		return undefined;
	}

	const fieldRules: FieldRules = {};

	for (const rule of resolved) {
		applyNativeFieldRule(fieldRules, rule, element);
	}

	if (resolved.some((rule) => !NATIVE_RUI_RULES.has(rule.type))) {
		fieldRules.validate = toValidator(resolved, element.name, 'Validation failed');
	}

	return fieldRules;
}

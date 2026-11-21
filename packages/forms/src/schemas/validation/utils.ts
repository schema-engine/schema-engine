import * as z from 'zod/mini';
import type { ValidationContext, ValidationRule, BaseValidationRule } from './types.js';
import type { BaseField } from '../base-field.js';
import type { ValidationRegistry } from './validation-registry.js';
import { walkLeafFields } from '@/lib/field-scope.js';
import { resolveFieldRef } from '@/lib/field-ref.js';
import { getValueAtPath } from '@/lib/path-values.js';
import { createDebounceScope } from '@/lib/debounce.js';
import type { DebounceScope } from '@/lib/debounce.js';

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
export function getValidationRulesForElement<TRule extends BaseValidationRule>(
	element: {
		$type?: string;
		rules?: readonly TRule[];
	},
	registry: ValidationRegistry,
): ReadonlyArray<TRule> | undefined {
	const configured = element.rules;
	const defaults = element.$type ? registry.getDefaultRulesForFieldType(element.$type) : [];
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
export function collectValidatableFields(
	elements: readonly object[],
	basePath: string,
	registry: ValidationRegistry,
): ValidatableField[] {
	const fields: ValidatableField[] = [];

	for (const { path, element } of walkLeafFields(elements, basePath)) {
		const rules = getValidationRulesForElement(
			element as { $type?: string; rules?: ReadonlyArray<BaseValidationRule> },
			registry,
		);
		if (rules?.length) {
			fields.push({ path, rules });
		}
	}

	return fields;
}

export interface ValidationContextInput {
	/** Nested value tree for the whole form. Renderers holding flat values expand them first. */
	values?: Record<string, unknown>;
	/** Rendered path of the field being validated, e.g. `contacts.0.email`. */
	fieldPath?: string;
	/** Reuse keyed async validation state across calls when the caller owns its lifetime. */
	debounceScope?: DebounceScope;
}

/**
 * Builds the context handed to every validation handler.
 *
 * @remarks
 * Both inputs default so a caller with no cross-field rules — a unit test, or a
 * schema generated without values — can still satisfy the required argument.
 * An empty context resolves every reference to `undefined`, which cross-field
 * rules treat as "not filled in" rather than as a match.
 */
export function createValidationContext({
	values = {},
	fieldPath = '',
	debounceScope,
}: ValidationContextInput = {}): ValidationContext {
	return {
		values,
		fieldPath,
		resolve: (fieldRef) => getValueAtPath(values, resolveFieldRef(fieldRef, fieldPath)),
		debounceScope: debounceScope ?? createDebounceScope(),
	};
}

/** The categories of rule that judge the shape of a value rather than whether there is one. */
const FORMAT_CATEGORIES: ReadonlySet<string> = new Set(['string', 'date']);

/**
 * Lets a format rule pass an empty value (`undefined`, `null` or `''`).
 *
 * @remarks
 * Whether a value is present is the `required` rule's question, so an optional field left blank has no
 * shape to check, as in a native `<input type="email">`. The rule's own issues are re-raised unchanged,
 * so a filled value reports the same message and path as before. A rule whose schema is async (a
 * consumer's phone validator) is awaited, so the wrapper is async too only for a filled value.
 */
function skippingEmpty(schema: z.ZodMiniType): z.ZodMiniType {
	return z.unknown().check(
		z.superRefine((value, context) => {
			if (value === undefined || value === null || value === '') return;
			const report = (result: Awaited<ReturnType<typeof z.safeParseAsync>>) => {
				if (result.success) return;
				for (const issue of result.error.issues) {
					context.addIssue({ code: 'custom', message: issue.message, path: issue.path });
				}
			};
			try {
				report(z.safeParse(schema, value));
			} catch (error) {
				if (!(error instanceof z.core.$ZodAsyncError)) throw error;
				return z.safeParseAsync(schema, value).then(report);
			}
		}),
	);
}

/**
 * Combines a field's rules into one Zod Mini schema.
 *
 * @remarks
 * A rule of the `string` or `date` category (email, url, pattern, minLength, phone and the other formats,
 * including a consumer's registrations in those categories) passes an empty value, so an optional field
 * can be left blank; `required` is what rejects it. Rules of other categories, such as `minItems`, are
 * unchanged.
 *
 * A rule that cannot be built throws `ValidationRuleError`; it is never skipped.
 *
 * `context` is required. Callers with no form values to offer pass
 * `createValidationContext()` explicitly, so omitting the form context is a
 * decision in the diff rather than an accident nobody notices until a
 * cross-field rule silently passes.
 */
export function createZodSchemaFromRules(
	rules: ReadonlyArray<ValidationRuleType> = [],
	context: ValidationContext,
	registry: ValidationRegistry,
): z.ZodMiniType {
	if (!rules.length) {
		return z.unknown();
	}

	const schemas: z.ZodMiniType[] = [];
	for (const rule of rules) {
		const ruleSchema = registry.createSchema(rule as ValidationRule, context);
		const category = registry.get(rule.type)?.category;
		schemas.push(category && FORMAT_CATEGORIES.has(category) ? skippingEmpty(ruleSchema) : ruleSchema);
	}

	let combinedSchema = schemas[0];
	for (let i = 1; i < schemas.length; i++) {
		combinedSchema = z.intersection(combinedSchema, schemas[i]);
	}

	return combinedSchema;
}

export function generateFormSchema(elements: FormElement[], registry: ValidationRegistry) {
	const schemaFields: Record<string, z.ZodMiniType> = {};

	for (const element of elements) {
		if (!element.name) continue;

		const rules = getValidationRulesForElement(element, registry);
		if (!rules?.length) continue;

		schemaFields[element.name] = createZodSchemaFromRules(
			rules,
			createValidationContext({ fieldPath: element.name }),
			registry,
		);
	}

	return z.object(schemaFields);
}

import type { FieldRules } from '@ecopages/radiant-ui/form';
import { validateFieldValue } from '@schema-engine/forms';
import type { ValidationRule } from '@schema-engine/forms/schemas';
import type { ValidationRegistry } from '@schema-engine/forms/schemas/validation';
import { createDebounceScope } from '@schema-engine/forms/lib/debounce';
import { getValidationRulesForElement, isFieldRequired } from '@schema-engine/forms/schemas/validation/utils';
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
 * Whether the render overlay marks an element required.
 *
 * @remarks
 * `renderRegisteredElement` overlays `required` on the config it renders: the
 * element's own required rule, a matching `require` constraint, or one passed
 * down by a fieldset. Element schemas do not declare it. Inputs show it as the
 * required marker only; it never enters the serialized rules, so constraint
 * sync, which owns the live `required` rule, can lift it again.
 */
export function isRenderedRequired(config: object): boolean {
	return 'required' in config && config.required === true;
}

/**
 * A container's child elements with the container's `disabled` and `required` passed down.
 *
 * @remarks
 * `required` passes when the render overlay marks the container required and
 * either the container declares constraints or its own required rule is not the
 * source; `se-field` then applies the live rule from the constraint context.
 */
export function withContainerState<T extends object>(
	config: { disabled?: boolean; constraints?: readonly unknown[]; rules?: ReadonlyArray<ValidationRule> },
	elements: readonly T[],
): readonly T[] {
	const disabled = config.disabled === true;
	const required =
		isRenderedRequired(config) && (Boolean(config.constraints?.length) || !isFieldRequired(config.rules));
	if (!disabled && !required) return elements;
	return elements.map((element) => ({
		...element,
		...(disabled ? { disabled: true } : {}),
		...(required ? { required: true } : {}),
	}));
}

function resolveValidationRegistry(registry?: ValidationRegistry): ValidationRegistry | undefined {
	return registry ?? peekOwningFormEngine()?.getValidationRegistry();
}

/**
 * Builds a Radiant UI validator that rebuilds its schema on every call.
 *
 * @remarks
 * The schema cannot be built once and reused: a cross-field rule reads the
 * form's current values through its context, so a schema is only correct for the
 * invocation whose context produced it. Radiant UI hands `validate` the form's
 * flat values, which are expanded into the engine's nested tree first.
 *
 * A call that a later call replaces resolves with the latest call's result.
 * Radiant UI writes whatever a validator returns, so without this a debounced
 * async check superseded by the next keystroke would show its `Validation
 * pending` failure between keystrokes. React Hook Form drops such results the
 * same way. A submit-time check still cannot pass on a value it never checked:
 * it waits for the check of the value the user typed last.
 */
function toValidator(
	rules: ReadonlyArray<ValidationRule>,
	fieldPath: string | undefined,
	registry: ValidationRegistry,
) {
	const debounceScope = createDebounceScope();
	let latest: Promise<string | true> = Promise.resolve(true);
	const settle = async (run: Promise<string | true>): Promise<string | true> => {
		try {
			const result = await run;
			if (run === latest) return result;
		} catch (error) {
			if (run === latest) throw error;
		}
		return settle(latest);
	};
	return (value: unknown, values: Record<string, unknown>) => {
		const run = validateFieldValue({
			element: { rules },
			value,
			values: expandValues(values ?? {}),
			fieldPath: fieldPath ?? '',
			registry,
			debounceScope,
		}).then((message) => message ?? true);
		latest = run;
		return settle(run);
	};
}

/** The element's authored rules plus the rules its registration attaches by default (`defaultFor`). */
export function resolveElementRules(
	element: FieldRulesSource,
	registry?: ValidationRegistry,
): ReadonlyArray<ValidationRule> | undefined {
	const resolvedRegistry = resolveValidationRegistry(registry);
	return resolvedRegistry ? getValidationRulesForElement(element, resolvedRegistry) : element.rules;
}

export function toFieldRules(element: FieldRulesSource, registry?: ValidationRegistry): FieldRules | undefined {
	const resolvedRegistry = resolveValidationRegistry(registry);
	const resolved = resolveElementRules(element, resolvedRegistry);
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
		fieldRules.validate = toValidator(resolved, element.name, resolvedRegistry);
	}

	return fieldRules;
}

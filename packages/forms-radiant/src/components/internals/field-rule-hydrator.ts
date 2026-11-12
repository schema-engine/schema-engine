import type { FormFieldElement } from '@/elements/form-field';
import type { FieldRules } from '@ecopages/radiant-ui/form';

type FieldValidator = Extract<NonNullable<FieldRules['validate']>, (...args: never[]) => unknown>;
import type { ValidationRule } from '@schema-engine/forms/schemas';
import { toFieldRules } from '@/lib/field-rules';
import { resolveFormEngine } from '@/contexts/resolve-form-engine';
import type { FormEngineRuntime as FormEngine } from '@schema-engine/forms/engine/form-engine';

/**
 * The parts of a rendered `se-field` that rule hydration uses.
 *
 * @remarks
 * Structural, so unit tests can pass an `se-field` whose element is not defined.
 */
export type FieldRulesHost = HTMLElement & { name?: string; rules?: FieldRules; onRulesUpdated?: () => void };

/**
 * The field's rendered path, which cross-field references resolve against.
 *
 * @remarks
 * The attribute is read before the property because Radiant can apply client
 * properties after connect, and hydration runs on connect.
 */
function readFieldName(field: FieldRulesHost): string | undefined {
	return field.getAttribute('name') ?? field.name;
}

function readSerializedRules(field: FieldRulesHost, engine: FormEngine | undefined): FieldRules | undefined {
	const validationRules = field.getAttribute('data-se-validation-rules');
	if (!validationRules) return undefined;
	try {
		return toFieldRules(
			{ rules: JSON.parse(validationRules) as ValidationRule[], name: readFieldName(field) },
			engine?.getValidationRegistry(),
		);
	} catch {
		return undefined;
	}
}

/**
 * @remarks
 * Serialized rules cannot carry validator functions. Preserve live validators,
 * a single function or a record of them, when markup hydration runs again
 * after client properties have been applied.
 */
export function readHydratedRules(field: FieldRulesHost): FieldRules | undefined {
	const currentRules = field.rules;
	if (currentRules && typeof currentRules === 'object' && currentRules.validate) {
		return undefined;
	}
	return readSerializedRules(field, resolveFormEngine(field));
}

/** Key of the validator derived from the engine rules inside a record of validators. */
const DERIVED_VALIDATOR_KEY = '@schema-engine/rules';

/**
 * Rebuilds the rules derived from the serialized rules with the registry of `engine`.
 *
 * @remarks
 * The serialized rules are the authored baseline, so the native rules and the derived validator are
 * replaced and nothing else is: a hand-written validator, which `withCustomValidate` keeps beside
 * the derived one under another key, survives. `previous` is the derived function of an earlier
 * rebuild, which a bare `validate` function is when no hand-written one exists.
 */
export function rebuildHydratedRules(
	field: FieldRulesHost,
	engine: FormEngine,
	previous?: unknown,
): FieldRules | undefined {
	const derived = readSerializedRules(field, engine);
	if (!derived) return undefined;
	const { validate: current, ...rest } = field.rules ?? {};
	const kept: Record<string, FieldValidator> =
		typeof current === 'function'
			? current === previous
				? {}
				: { custom: current }
			: Object.fromEntries(Object.entries(current ?? {}).filter(([key]) => key !== DERIVED_VALIDATOR_KEY));
	const { validate: freshValidate, ...native } = derived;
	const fresh = typeof freshValidate === 'function' ? freshValidate : undefined;
	const validators: Record<string, FieldValidator> = {
		...(fresh ? { [DERIVED_VALIDATOR_KEY]: fresh } : {}),
		...kept,
	};
	const only = Object.keys(kept).length === 0 && fresh ? fresh : undefined;
	return {
		...rest,
		...native,
		...(only ? { validate: only } : Object.keys(validators).length ? { validate: validators } : {}),
	};
}

export function hydrateFieldRules(root: ParentNode): void {
	for (const field of root.querySelectorAll<FormFieldElement>('se-field[data-se-validation-rules]')) {
		const rules = readHydratedRules(field);
		if (rules) {
			field.rules = rules;
			field.onRulesUpdated();
		}
	}
}

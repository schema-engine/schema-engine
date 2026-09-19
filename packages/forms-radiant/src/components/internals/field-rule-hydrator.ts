import type { FieldRules } from '@ecopages/radiant-ui/form';
import { isServer } from '@ecopages/radiant/is-server';
import type { ValidationRule } from '@schema-engine/forms/schemas';
import { toFieldRules } from '@/lib/field-rules';

type SerializedPattern = {
	$type: 'regexp';
	source: string;
	flags: string;
};

function isSerializedPattern(value: unknown): value is SerializedPattern {
	return (
		typeof value === 'object' &&
		value !== null &&
		Reflect.get(value, '$type') === 'regexp' &&
		typeof Reflect.get(value, 'source') === 'string' &&
		typeof Reflect.get(value, 'flags') === 'string'
	);
}

export function reviveRules(value: string | null): FieldRules | undefined {
	if (!value) {
		return undefined;
	}

	try {
		return JSON.parse(value, (_key, nestedValue: unknown) =>
			isSerializedPattern(nestedValue) ? new RegExp(nestedValue.source, nestedValue.flags) : nestedValue,
		) as FieldRules;
	} catch {
		return undefined;
	}
}

/**
 * The field's rendered path, which cross-field references resolve against.
 *
 * @remarks
 * The attribute is read before the property because Radiant can apply client
 * properties after connect, and hydration runs on connect.
 */
function readFieldName(field: HTMLElement): string | undefined {
	return field.getAttribute('name') ?? (Reflect.get(field, 'name') as string | undefined);
}

/**
 * @remarks
 * Serialized rules cannot carry validator functions. Preserve live validators
 * when markup hydration runs again after client properties have been applied.
 */
export function readHydratedRules(field: HTMLElement): FieldRules | undefined {
	const currentRules: unknown = Reflect.get(field, 'rules');
	if (
		currentRules &&
		typeof currentRules === 'object' &&
		typeof Reflect.get(currentRules, 'validate') === 'function'
	) {
		return undefined;
	}

	const validationRules = field.getAttribute('data-se-validation-rules');
	if (validationRules) {
		try {
			return toFieldRules({
				rules: JSON.parse(validationRules) as ValidationRule[],
				name: readFieldName(field),
			});
		} catch {
			return undefined;
		}
	}

	return reviveRules(field.getAttribute('data-se-field-rules'));
}

export function hydrateField(field: HTMLElement): void {
	const rules = readHydratedRules(field);
	if (!rules) {
		return;
	}
	Reflect.set(field, 'rules', rules);
	(field as { connectToForm?: () => void }).connectToForm?.();
}

export function hydrateFieldRules(root: ParentNode): void {
	const fields = root.querySelectorAll<HTMLElement>(
		'se-field[data-se-field-rules], se-field[data-se-validation-rules]',
	);
	for (const field of fields) {
		hydrateField(field);
	}
}

const HYDRATOR_INSTALLED = Symbol.for('@schema-engine/forms-radiant.field-rule-hydrator');

/**
 * @remarks Registers a single document-level hydrator for client navigations.
 * Skipped during SSR so Radiant's minimal document does not accumulate listeners.
 */
export function ensureDocumentFieldRuleHydrator(doc: Document): void {
	if (isServer || HYDRATOR_INSTALLED in doc) {
		return;
	}

	Reflect.set(doc, HYDRATOR_INSTALLED, true);
	hydrateFieldRules(doc);
	doc.addEventListener('eco:after-swap', () => hydrateFieldRules(doc));
}

if (typeof document !== 'undefined') {
	ensureDocumentFieldRuleHydrator(document);
}

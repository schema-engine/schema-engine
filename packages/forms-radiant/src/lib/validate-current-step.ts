import { walkNamedElements } from '@schema-engine/forms';
import { expandFieldTemplatePaths } from '@schema-engine/forms/lib/path-values';

/**
 * Every field path a step renders, expanded against the live value tree.
 *
 * @remarks
 * Reads the whole element tree, not just its top level: a step whose fields live
 * inside a fieldset or an array used to contribute only the container's own name,
 * so a wizard advanced without ever validating the fields the user had to fill.
 * Leaf templates (`contacts.email`) expand to one path per row so each row is
 * checked; with no rows yet the template is returned unchanged and resolves to no
 * registered field, which validates as clean. Container names are kept whole — an
 * array field carries its own rules (`minItems`), and expanding it would replace
 * `contacts` with the per-row `contacts.0`, dropping those rules from the check.
 */
export function fieldNamesForStep(
	step: { elements?: ReadonlyArray<object> } | undefined,
	values: Record<string, unknown> = {},
): string[] {
	const names = walkNamedElements([...(step?.elements ?? [])]).flatMap((node) =>
		node.hasChildren ? [node.path] : expandFieldTemplatePaths(values, node.path),
	);
	return [...new Set(names)];
}

type StepValidationStore = {
	isSubmitted: boolean;
	validateField: (name: string) => Promise<boolean>;
	markTouched: (name: string) => void;
};

export async function validateCurrentStepFields(store: StepValidationStore, fieldNames: string[]): Promise<boolean> {
	if (fieldNames.length === 0) {
		return true;
	}

	const results = await Promise.all(fieldNames.map((name) => store.validateField(name)));
	const isValid = results.every(Boolean);
	if (isValid) {
		return true;
	}

	store.isSubmitted = true;
	for (const name of fieldNames) {
		store.markTouched(name);
	}
	return false;
}

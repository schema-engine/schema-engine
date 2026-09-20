import { buildDependencyIndex, shouldSurfaceDependentError } from '@schema-engine/forms/schemas/validation';
import { getValueAtPath } from '@schema-engine/forms/lib/path-values';
import type { FormController } from '@/adapters/radiant/controller';

import type { ValidationRegistry } from '@schema-engine/forms/schemas/validation';

/**
 * Re-validates a field when a field its rules read changes.
 *
 * @remarks
 * The subscription diffs *values* at the watched paths rather than reacting to
 * store notifications directly, and that is load-bearing rather than an
 * optimisation: `validateField` writes `errors`, which notifies, which re-enters
 * this listener. Diffing means the re-entry sees no value change and stops. Two
 * fields asserting against each other would otherwise loop forever.
 *
 * Only a dependent the user has already touched, or any dependent once the form
 * has been submitted, is re-validated, so typing a password does not light up a
 * confirmation nobody has reached yet.
 *
 * @returns Unsubscribe, or a no-op when the controller has no store yet.
 */
export function connectValidationDependencies(
	controller: FormController,
	elements: readonly object[],
	registry: ValidationRegistry,
): () => void {
	const store = controller.store;
	if (!store) {
		return () => {};
	}

	let previous = controller.getValues();

	return controller.watchForm((values) => {
		const index = buildDependencyIndex(elements, values, registry);
		const changed = index.watched.filter(
			(path) => !Object.is(getValueAtPath(values, path), getValueAtPath(previous, path)),
		);
		previous = values;

		const dependents = index.expand(changed);
		if (dependents.length === 0) {
			return;
		}

		const { touched, isSubmitted } = store.getState();
		for (const dependent of dependents) {
			if (shouldSurfaceDependentError({ touched: Boolean(touched[dependent]), submitted: isSubmitted })) {
				void store.validateField(dependent);
			}
		}
	});
}

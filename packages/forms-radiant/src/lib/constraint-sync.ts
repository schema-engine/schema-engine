import type { FormFieldElement } from '@/elements/form-field';
import type { NormalizedFormConfig } from '@schema-engine/forms';
import type { FormController } from '@/adapters/radiant/controller';
import { createConstraintLookup } from './constraint-elements';
import { evaluateConstraints } from '@schema-engine/forms/constraints';
import { applyConstraintRequired } from './constraint-required-rules';
import { shouldSurfaceDependentError } from '@schema-engine/forms/schemas/validation';

/**
 * Fields this wrapper owns, excluding those belonging to a nested constraint.
 *
 * @remarks
 * Without the guard, a constrained field inside a constrained fieldset would be
 * written twice in one pass and the later write — document order, so the inner
 * one — would silently win over its own parent's `disable`.
 */
function ownedFields(wrapper: HTMLElement): FormFieldElement[] {
	return [...wrapper.querySelectorAll<FormFieldElement>('se-field')].filter(
		(field) => field.closest('[data-se-constraint-field]') === wrapper,
	);
}

export function syncConstraints(root: ParentNode, config: NormalizedFormConfig, form?: FormController): void {
	if (!config || !form?.ready) {
		return;
	}

	const declaring = createConstraintLookup(config);
	const values = form.getValues();

	for (const target of root.querySelectorAll<HTMLElement>('[data-se-constraint-field]')) {
		const fieldPath = target.getAttribute('data-se-constraint-field') ?? '';
		const item = declaring(fieldPath);
		if (!item) {
			continue;
		}

		const { shouldShow, shouldDisable, isRequired } = evaluateConstraints({
			constraints: item.constraints,
			baseRequired: item.isRequired,
			fieldPath,
			values,
		});

		target.hidden = !shouldShow;
		for (const field of ownedFields(target)) {
			field.disabled = item.disabled || shouldDisable;
			const requiredChanged = applyConstraintRequired(field, isRequired);
			const name = field.getAttribute('name');
			const store = form?.store;
			if (name && store) {
				const { touched, isSubmitted } = store.getState();
				if (
					requiredChanged &&
					shouldSurfaceDependentError({ touched: Boolean(touched[name]), submitted: isSubmitted })
				) {
					void store.validateField(name);
				}
			}
		}
	}
}

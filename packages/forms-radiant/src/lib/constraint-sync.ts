import type { FormFieldElement } from '@/elements/form-field';
import type { NormalizedFormConfig } from '@schema-engine/forms';
import type { FormController } from '@/adapters/radiant/controller';
import { createAuthoredDisabledLookup, createConstraintLookup } from './constraint-elements';
import { evaluateConstraints } from '@schema-engine/forms/constraints';
import { applyConstraintRequired } from './constraint-required-rules';
import { shouldSurfaceDependentError } from '@schema-engine/forms/schemas/validation';

const CONSTRAINT_TARGET = '[data-se-constraint-field]';

interface ConstraintState {
	readonly disabled: boolean;
	readonly required: boolean;
}

/**
 * Applies live constraint results to the form's wrappers and fields.
 *
 * @remarks
 * A field's flags compose its own authored state with every constraint wrapper
 * around it, the field's own and its containers'. Render composes the same:
 * `disabled` through a fieldset or array, and `required` as the field's required marker;
 * the live `required` rule reaches a field only through this sync.
 * Applying only the nearest declaring item's flags would give an unconstrained
 * child of a constrained fieldset the fieldset's `disabled` instead of its own.
 */
export function syncConstraints(root: ParentNode, config: NormalizedFormConfig, form?: FormController): void {
	if (!config || !form?.ready) {
		return;
	}

	const declaring = createConstraintLookup(config);
	const authoredDisabled = createAuthoredDisabledLookup(config);
	const values = form.getValues();
	const states = new Map<Element, ConstraintState>();

	for (const target of root.querySelectorAll<HTMLElement>(CONSTRAINT_TARGET)) {
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
		states.set(target, { disabled: item.disabled || shouldDisable, required: isRequired });
	}

	for (const field of root.querySelectorAll<FormFieldElement>(`${CONSTRAINT_TARGET} se-field`)) {
		const name = field.getAttribute('name');
		let governed = false;
		let disabled = authoredDisabled(name ?? '');
		let required = false;
		for (
			let target = field.closest(CONSTRAINT_TARGET);
			target;
			target = target.parentElement?.closest(CONSTRAINT_TARGET) ?? null
		) {
			const state = states.get(target);
			if (state) {
				governed = true;
				disabled ||= state.disabled;
				required ||= state.required;
			}
		}
		if (!governed) {
			continue;
		}

		field.disabled = disabled;
		const requiredChanged = applyConstraintRequired(field, required);
		const store = form.store;
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

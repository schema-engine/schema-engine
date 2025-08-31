import { useMemo } from 'react';
import { useFormContext, useWatch } from 'react-hook-form';
import type { ConstraintLogic } from '../types/form';

/**
 * Evaluate a single constraint condition against a watched value.
 *
 * @param constraint - Constraint logic object describing the operator and value
 * @param watchedValue - Current value of the referenced field from the form
 * @returns true if the constraint condition is satisfied
 */
function evaluateConstraint(constraint: ConstraintLogic, watchedValue: any): boolean {
	const { operator, value } = constraint;

	switch (operator) {
		case 'equals':
			return watchedValue === value;
		case 'not_equals':
			return watchedValue !== value;
		case 'contains':
			return String(watchedValue || '').includes(String(value));
		case 'not_contains':
			return !String(watchedValue || '').includes(String(value));
		case 'greater_than':
			return Number(watchedValue) > Number(value);
		case 'less_than':
			return Number(watchedValue) < Number(value);
		case 'is_empty':
			return !watchedValue || watchedValue === '' || watchedValue === null || watchedValue === undefined;
		case 'is_not_empty':
			return watchedValue && watchedValue !== '' && watchedValue !== null && watchedValue !== undefined;
		default:
			return false;
	}
}

/**
 * Result returned by `useConstraintLogic`.
 *
 * shouldShow: whether the field should be rendered.
 * shouldDisable: whether the field should be disabled.
 * isRequired: whether the field should be treated as required.
 */
export interface UseConstraintLogicResult {
	shouldShow: boolean;
	shouldDisable: boolean;
	isRequired: boolean;
}

/**
 * Custom hook to handle constraint logic evaluation
 * Shared between DynamicField and DynamicFieldset components
 *
 * @param constraints - Array of constraint logic configurations
 * @param baseRequired - Base required state for the field
 * @param fieldPath - Current field path context for relative field resolution in arrays
 */
/**
 * React hook to evaluate constraint logic for a field.
 *
 * Watches referenced form fields and computes whether the target field
 * should be shown, disabled, or marked required based on provided constraints.
 *
 * @param constraints - Array of constraint logic rules that reference other fields
 * @param baseRequired - Base required state for the field (OR'ed with require constraints)
 * @param fieldPath - Optional path of the current field to resolve relative constraint fields (array items)
 * @returns UseConstraintLogicResult indicating visibility/disabled/required state
 */
export function useConstraintLogic(
	constraints: ConstraintLogic[] = [],
	baseRequired = false,
	fieldPath?: string,
): UseConstraintLogicResult {
	const { control } = useFormContext();

	/**
	 * Get the watched fields based on the constraints
	 * This ensures we are watching the correct fields in the form
	 * It handles nested fields by resolving their paths
	 */
	const watchedFields = useMemo(() => {
		return constraints.map((constraint) => {
			const constraintField = constraint.field;

			// If a fieldPath is provided (e.g. when rendering array items) and the
			// constraint refers to a local sibling field (no dot in the name),
			// resolve it relative to the current fieldPath so the array index is
			// preserved (e.g. `validationRules.0.type`).
			if (fieldPath && !constraintField.includes('.')) {
				const parts = fieldPath.split('.');
				const last = parts[parts.length - 1];
				// If last segment is a numeric index (array item root), keep it
				// e.g. fieldPath = 'validationRules.0' -> 'validationRules.0.type'
				if (!Number.isNaN(Number(last))) {
					return `${fieldPath}.${constraintField}`;
				}
				// Otherwise assume fieldPath ends with the element's field name
				// and resolve relative to its parent so we preserve the index
				parts.pop();
				const parentPath = parts.join('.');
				return parentPath ? `${parentPath}.${constraintField}` : constraintField;
			}

			return constraintField;
		});
	}, [constraints, fieldPath]);

	const watchedValues = useWatch({
		control,
		name: watchedFields,
	});

	const watchedValuesMap = useMemo(() => {
		const map: Record<string, any> = {};
		constraints.forEach((constraint, index) => {
			const value = Array.isArray(watchedValues) ? watchedValues[index] : watchedValues;
			map[constraint.field] = value;
		});
		return map;
	}, [constraints, watchedValues]);

	const shouldShow = useMemo(() => {
		if (constraints.length === 0) return true;

		// Separate show/hide constraints. Multiple 'show' constraints should be
		// treated as OR (show if any show-condition is met). Hide constraints
		// are applied afterward to allow explicit hiding.
		const showConstraints = constraints.filter((c) => c.action === 'show');
		const hideConstraints = constraints.filter((c) => c.action === 'hide');

		// If there are show constraints, at least one must be satisfied to show
		if (showConstraints.length > 0) {
			const anyShow = showConstraints.some((constraint) => {
				const watchedValue = watchedValuesMap[constraint.field];
				return evaluateConstraint(constraint, watchedValue);
			});

			if (!anyShow) return false;
		}

		// If any hide constraint is satisfied, the field should be hidden
		if (hideConstraints.length > 0) {
			const anyHide = hideConstraints.some((constraint) => {
				const watchedValue = watchedValuesMap[constraint.field];
				return evaluateConstraint(constraint, watchedValue);
			});

			if (anyHide) return false;
		}

		// If no show constraints or show constraints passed and no hide applied,
		// the field should be visible.
		return true;
	}, [constraints, watchedValuesMap]);

	const shouldDisable = useMemo(() => {
		return constraints.some((constraint) => {
			const watchedValue = watchedValuesMap[constraint.field];
			const conditionMet = evaluateConstraint(constraint, watchedValue);

			switch (constraint.action) {
				case 'disable':
					return conditionMet;
				case 'enable':
					return !conditionMet;
				default:
					return false;
			}
		});
	}, [constraints, watchedValuesMap]);

	const isRequired = useMemo(() => {
		const hasRequireAction = constraints.some((constraint) => {
			const watchedValue = watchedValuesMap[constraint.field];
			const conditionMet = evaluateConstraint(constraint, watchedValue);

			return constraint.action === 'require' && conditionMet;
		});

		return baseRequired || hasRequireAction;
	}, [constraints, watchedValuesMap, baseRequired]);

	return {
		shouldShow,
		shouldDisable,
		isRequired,
	};
}

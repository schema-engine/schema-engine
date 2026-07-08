import { useMemo, useRef } from 'react';
import { useFormContext, useWatch } from 'react-hook-form';
import { ConstraintEvaluator, type ConstraintEvaluationResult } from '@schema-engine/forms/constraints';
import type { ConstraintLogic } from '@schema-engine/forms/schemas/base-field';

/**
 * Result returned by `useConstraintLogic`
 */
export type UseConstraintLogicResult = ConstraintEvaluationResult;

/**
 * React hook to evaluate constraint logic for a field
 *
 * Watches referenced form fields and uses the ConstraintEvaluator from core
 * to compute whether the target field should be shown, disabled, or marked required
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
	const evaluatorRef = useRef<ConstraintEvaluator | null>(null);

	if (!evaluatorRef.current) {
		evaluatorRef.current = new ConstraintEvaluator();
	}

	/**
	 * Get the watched fields based on the constraints
	 * This ensures we are watching the correct fields in the form
	 * It handles nested fields by resolving their paths
	 */
	const watchedFields = useMemo(() => {
		return constraints.map((constraint) => {
			const constraintField = constraint.field;
			/**
			 * If a fieldPath is provided (e.g. when rendering array items) and the
			 * constraint refers to a local sibling field (no dot in the name),
			 * resolve it relative to the current fieldPath so the array index is
			 * preserved (e.g. `validationRules.0.type`).
			 */
			if (fieldPath && !constraintField.includes('.')) {
				const parts = fieldPath.split('.');
				const last = parts[parts.length - 1];
				/**
				 * If last segment is a numeric index (array item root), keep it
				 * e.g. fieldPath = 'validationRules.0' -> 'validationRules.0.type'
				 */
				if (!Number.isNaN(Number(last))) {
					return `${fieldPath}.${constraintField}`;
				}
				/**
				 * Otherwise assume fieldPath ends with the element's field name
				 * and resolve relative to its parent so we preserve the index
				 */
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

	const fieldValues = useMemo(() => {
		const map: Record<string, any> = {};
		constraints.forEach((constraint, index) => {
			const value = Array.isArray(watchedValues) ? watchedValues[index] : watchedValues;
			map[constraint.field] = value;
		});
		return map;
	}, [constraints, watchedValues]);

	return useMemo(
		() =>
			evaluatorRef.current!.evaluate({
				constraints,
				fieldValues,
				baseRequired,
			}),
		[constraints, fieldValues, baseRequired],
	);
}

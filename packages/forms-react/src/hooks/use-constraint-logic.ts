import { useMemo } from 'react';
import { useWatchField } from '@/adapters/context';
import { ConstraintEvaluator, type ConstraintEvaluationResult } from '@schema-engine/forms/constraints';
import type { ConstraintLogic } from '@schema-engine/forms/schemas/base-field';

export type UseConstraintLogicResult = ConstraintEvaluationResult;

function resolveConstraintField(constraintField: string, fieldPath?: string) {
	if (!fieldPath || constraintField.includes('.')) {
		return constraintField;
	}

	const parts = fieldPath.split('.');
	const last = parts[parts.length - 1];
	if (!Number.isNaN(Number(last))) {
		return `${fieldPath}.${constraintField}`;
	}

	parts.pop();
	const parentPath = parts.join('.');
	return parentPath ? `${parentPath}.${constraintField}` : constraintField;
}

/**
 * Evaluate constraint logic for a field against the active adapter's watched values.
 */
export function useConstraintLogic(
	constraints: readonly ConstraintLogic[] = [],
	baseRequired = false,
	fieldPath?: string,
): UseConstraintLogicResult {
	const evaluator = useMemo(() => new ConstraintEvaluator(), []);

	const watchedFields = useMemo(
		() => constraints.map((constraint) => resolveConstraintField(constraint.field, fieldPath)),
		[constraints, fieldPath],
	);

	const watchedValues = useWatchField<unknown[]>(watchedFields);

	const fieldValues = useMemo(() => {
		const map: Record<string, unknown> = {};
		constraints.forEach((constraint, index) => {
			map[constraint.field] = Array.isArray(watchedValues) ? watchedValues[index] : watchedValues;
		});
		return map;
	}, [constraints, watchedValues]);

	return useMemo(
		() =>
			evaluator.evaluate({
				constraints,
				fieldValues: fieldValues as Record<string, any>,
				baseRequired,
			}),
		[evaluator, constraints, fieldValues, baseRequired],
	);
}

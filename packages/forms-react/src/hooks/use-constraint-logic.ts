import { useMemo } from 'react';
import { useWatchField } from '@/adapters/context';
import {
	evaluateResolvedConstraints,
	resolveConstraintPaths,
	type ConstraintEvaluationResult,
} from '@schema-engine/forms/constraints';
import type { ConstraintLogic } from '@schema-engine/forms/schemas/base-field';

export type UseConstraintLogicResult = ConstraintEvaluationResult;

/**
 * Evaluate constraint logic for a field against the active adapter's watched values.
 *
 * @remarks
 * Resolution is split from evaluation here because the adapter subscribes to the
 * resolved paths: `useWatchField` must receive the same list, in the same order,
 * that the returned values are then matched against.
 */
export function useConstraintLogic(
	constraints: readonly ConstraintLogic[] = [],
	baseRequired = false,
	fieldPath?: string,
): UseConstraintLogicResult {
	const watchedFields = useMemo(() => resolveConstraintPaths(constraints, fieldPath), [constraints, fieldPath]);

	const watchedValues = useWatchField<unknown[]>(watchedFields);

	const fieldValues = useMemo(() => {
		const map: Record<string, unknown> = {};
		constraints.forEach((constraint, index) => {
			map[constraint.field] = Array.isArray(watchedValues) ? watchedValues[index] : watchedValues;
		});
		return map;
	}, [constraints, watchedValues]);

	return useMemo(
		() => evaluateResolvedConstraints(constraints, fieldValues, baseRequired),
		[constraints, fieldValues, baseRequired],
	);
}

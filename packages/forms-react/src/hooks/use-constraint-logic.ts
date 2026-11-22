import { useMemo } from 'react';
import { useWatch } from '@/hooks/form-state/use-watch';
import {
	evaluateResolvedConstraints,
	resolveConstraintPaths,
	type ConstraintEvaluationResult,
} from '@schema-engine/forms/constraints';
import type { ConstraintLogic } from '@schema-engine/forms/schemas/base-field';

export type UseConstraintLogicResult = ConstraintEvaluationResult;

const noConstraints: readonly ConstraintLogic[] = [];

/**
 * Evaluate constraint logic for a field against the active adapter's watched values.
 *
 * @remarks
 * Resolution is split from evaluation here because the adapter subscribes to the
 * resolved paths: `useWatch` must receive the same list, in the same order,
 * that the returned values are then matched against.
 */
export function useConstraintLogic(
	fieldPath: string,
	constraints: readonly ConstraintLogic[] = noConstraints,
	baseRequired = false,
): UseConstraintLogicResult {
	const watchedFields = useMemo(() => resolveConstraintPaths(constraints, fieldPath), [constraints, fieldPath]);

	const watchedValues = useWatch(watchedFields);

	const fieldValues = useMemo(() => {
		const map: Record<string, unknown> = {};
		constraints.forEach((constraint, index) => {
			map[constraint.field] = watchedValues[index];
		});
		return map;
	}, [constraints, watchedValues]);

	return useMemo(
		() => evaluateResolvedConstraints(constraints, fieldValues, baseRequired),
		[constraints, fieldValues, baseRequired],
	);
}

import { useMemo } from "react";
import { useFormContext, useWatch } from "react-hook-form";
import type { ConstraintLogic } from "../types/form";

/**
 * Evaluates a single constraint condition
 */
function evaluateConstraint(constraint: ConstraintLogic, watchedValue: any): boolean {
	const { operator, value } = constraint;

	switch (operator) {
		case "equals":
			return watchedValue === value;
		case "not_equals":
			return watchedValue !== value;
		case "contains":
			return String(watchedValue || "").includes(String(value));
		case "not_contains":
			return !String(watchedValue || "").includes(String(value));
		case "greater_than":
			return Number(watchedValue) > Number(value);
		case "less_than":
			return Number(watchedValue) < Number(value);
		case "is_empty":
			return (
				!watchedValue || watchedValue === "" || watchedValue === null || watchedValue === undefined
			);
		case "is_not_empty":
			return (
				watchedValue && watchedValue !== "" && watchedValue !== null && watchedValue !== undefined
			);
		default:
			return false;
	}
}

export interface UseConstraintLogicResult {
	shouldShow: boolean;
	shouldDisable: boolean;
	isRequired: boolean;
}

/**
 * Custom hook to handle constraint logic evaluation
 * Shared between DynamicField and DynamicFieldset components
 */
export function useConstraintLogic(
	constraints: ConstraintLogic[] = [],
	baseRequired = false
): UseConstraintLogicResult {
	const { control } = useFormContext();

	const watchedFields = useMemo(
		() => constraints.map((constraint) => constraint.field),
		[constraints]
	);

	const watchedValues = useWatch({
		control,
		name: watchedFields,
	});

	const watchedValuesMap = useMemo(() => {
		const map: Record<string, any> = {};
		watchedFields.forEach((fieldName, index) => {
			map[fieldName] = Array.isArray(watchedValues) ? watchedValues[index] : watchedValues;
		});
		return map;
	}, [watchedFields, watchedValues]);

	const shouldShow = useMemo(() => {
		if (constraints.length === 0) return true;

		return constraints.every((constraint) => {
			const watchedValue = watchedValuesMap[constraint.field];
			const conditionMet = evaluateConstraint(constraint, watchedValue);

			switch (constraint.action) {
				case "show":
					return conditionMet;
				case "hide":
					return !conditionMet;
				default:
					return true;
			}
		});
	}, [constraints, watchedValuesMap]);

	const shouldDisable = useMemo(() => {
		return constraints.some((constraint) => {
			const watchedValue = watchedValuesMap[constraint.field];
			const conditionMet = evaluateConstraint(constraint, watchedValue);

			switch (constraint.action) {
				case "disable":
					return conditionMet;
				case "enable":
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

			return constraint.action === "require" && conditionMet;
		});

		return baseRequired || hasRequireAction;
	}, [constraints, watchedValuesMap, baseRequired]);

	return {
		shouldShow,
		shouldDisable,
		isRequired,
	};
}

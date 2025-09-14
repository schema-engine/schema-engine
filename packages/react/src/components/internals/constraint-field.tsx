import { useForm, useWatch } from 'react-hook-form';
import { FormElement } from './field-renderer';
import type { FieldConfig, ConstraintLogic } from '@json-form-engine/core/schemas';
import { useMemo } from 'react';

interface ConstraintFieldProps {
	field: FieldConfig;
}

/**
 * Evaluates a single constraint condition
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
 * Component that renders fields with CSS-based visibility instead of conditional rendering
 * This avoids React re-render cycles while still providing constraint functionality
 */
export function ConstraintField({ field }: ConstraintFieldProps) {
	const formMethods = useForm();
	const constraints = field.constraints || [];

	const watchedFields = constraints.map((constraint) => constraint.field);
	const watchedValues = useWatch({
		control: formMethods.control,
		name: watchedFields,
	});

	console.log(watchedValues);

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
				case 'show':
					return conditionMet;
				case 'hide':
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

		// Check if field has required validation rule
		const hasRequiredValidation =
			field.rules?.some((rules: any) => rules?.type === 'required' || rules?.rule === 'required') || false;

		return hasRequiredValidation || hasRequireAction;
	}, [constraints, watchedValuesMap, field.rules]);

	if (!shouldShow) {
		return null;
	}

	const enhancedField = {
		...field,
		disabled: field.disabled || shouldDisable,
		required: isRequired,
	};

	return <FormElement config={enhancedField} />;
}

import type { ConstraintLogic } from '../schemas';

/**
 * Result from evaluating constraint logic
 */
export interface ConstraintEvaluationResult {
	shouldShow: boolean;
	shouldDisable: boolean;
	isRequired: boolean;
}

/**
 * Evaluates a single constraint condition against a watched value
 * Supports various operators like equals, not_equals, contains, greater_than, less_than, is_empty, is_not_empty
 *
 * For 'contains' and 'not_contains':
 * - If the constraint value is an array, it checks if the watched value is in that array
 * - If the constraint value is a string, it checks if that string is contained within the watched value (which can also be a string)
 *
 * For empty checks:
 * - 'is_empty' returns true for null, undefined, empty string, or empty array
 * - 'is_not_empty' returns true for any non-empty value
 */
function evaluateConstraint(constraint: ConstraintLogic, watchedValue: any): boolean {
	const { operator, value } = constraint;

	switch (operator) {
		case 'equals':
			return watchedValue === value;
		case 'not_equals':
			return watchedValue !== value;
		case 'contains':
			if (Array.isArray(value)) {
				return value.includes(watchedValue);
			}
			return String(watchedValue || '').includes(String(value));
		case 'not_contains':
			if (Array.isArray(value)) {
				return !value.includes(watchedValue);
			}
			return !String(watchedValue || '').includes(String(value));
		case 'greater_than':
			return Number(watchedValue) > Number(value);
		case 'less_than':
			return Number(watchedValue) < Number(value);
		case 'is_empty':
			if (Array.isArray(watchedValue)) {
				return watchedValue.length === 0;
			}
			return !watchedValue || watchedValue === '' || watchedValue === null || watchedValue === undefined;
		case 'is_not_empty':
			if (Array.isArray(watchedValue)) {
				return watchedValue.length > 0;
			}
			return watchedValue && watchedValue !== '' && watchedValue !== null && watchedValue !== undefined;
		default:
			return false;
	}
}

/**
 * Parameters for evaluating constraint logic
 */
export interface EvaluateConstraintsParams {
	constraints?: readonly ConstraintLogic[];
	fieldValues: Record<string, any>;
	baseRequired?: boolean;
}

/**
 * Framework-agnostic constraint logic evaluator
 * Evaluates constraint logic rules to determine field visibility, disabled state, and required state
 */
export class ConstraintEvaluator {
	/**
	 * Evaluate constraint logic against provided field values
	 *
	 * @param params - Evaluation parameters
	 * @param params.constraints - Array of constraint logic rules
	 * @param params.fieldValues - Map of field names to their current values
	 * @param params.baseRequired - Base required state for the field
	 * @returns Evaluation result indicating visibility, disabled, and required state
	 */
	evaluate({
		constraints = [],
		fieldValues,
		baseRequired = false,
	}: EvaluateConstraintsParams): ConstraintEvaluationResult {
		return {
			shouldShow: this.evaluateVisibility(constraints, fieldValues),
			shouldDisable: this.evaluateDisabled(constraints, fieldValues),
			isRequired: this.evaluateRequired(constraints, fieldValues, baseRequired),
		};
	}

	/**
	 * Evaluate visibility constraints (show/hide actions)
	 * Multiple show constraints are treated as OR (show if any condition is met)
	 * Hide constraints are applied afterward to allow explicit hiding
	 */
	private evaluateVisibility(constraints: readonly ConstraintLogic[], fieldValues: Record<string, any>): boolean {
		if (constraints.length === 0) return true;

		const showConstraints = constraints.filter((c) => c.action === 'show');
		const hideConstraints = constraints.filter((c) => c.action === 'hide');

		if (showConstraints.length > 0) {
			const anyShow = showConstraints.some((constraint) => {
				const watchedValue = fieldValues[constraint.field];
				return evaluateConstraint(constraint, watchedValue);
			});

			if (!anyShow) return false;
		}

		if (hideConstraints.length > 0) {
			const anyHide = hideConstraints.some((constraint) => {
				const watchedValue = fieldValues[constraint.field];
				return evaluateConstraint(constraint, watchedValue);
			});

			if (anyHide) return false;
		}

		return true;
	}

	/**
	 * Evaluate disabled constraints (enable/disable actions)
	 */
	private evaluateDisabled(constraints: readonly ConstraintLogic[], fieldValues: Record<string, any>): boolean {
		return constraints.some((constraint) => {
			const watchedValue = fieldValues[constraint.field];
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
	}

	/**
	 * Evaluate required constraints (require action)
	 * Base required state is OR'ed with constraint-based required state
	 */
	private evaluateRequired(
		constraints: readonly ConstraintLogic[],
		fieldValues: Record<string, any>,
		baseRequired: boolean,
	): boolean {
		const hasRequireAction = constraints.some((constraint) => {
			const watchedValue = fieldValues[constraint.field];
			const conditionMet = evaluateConstraint(constraint, watchedValue);

			return constraint.action === 'require' && conditionMet;
		});

		return baseRequired || hasRequireAction;
	}
}

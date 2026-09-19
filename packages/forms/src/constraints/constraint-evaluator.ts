import type { ConstraintLogic } from '../schemas';
import { getValueAtPath } from '@/lib/path-values';

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
 * Resolves an authored constraint field against the scope of the field declaring it.
 *
 * @remarks
 * A constraint names a sibling (`accountType`), so the path it resolves to depends
 * on where the declaring field is rendered. Inside an array item (`contacts.0.email`)
 * the sibling is `contacts.0.accountType`; inside an object (`address.street`) it is
 * `address.accountType`. A constraint field that already contains a dot is treated as
 * absolute and returned unchanged.
 *
 * This lived in both renderer packages as identical private copies until the
 * duplication drifted; it belongs next to the evaluator that consumes it.
 */
export function resolveConstraintPath(constraintField: string, fieldPath?: string): string {
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
 * Every value path a constraint set depends on, in declaration order.
 *
 * @remarks
 * React needs the list separately from evaluation so it can subscribe to exactly
 * those paths; Radiant reads a whole-store snapshot and does not.
 */
export function resolveConstraintPaths(constraints: readonly ConstraintLogic[] = [], fieldPath?: string): string[] {
	return constraints.map((constraint) => resolveConstraintPath(constraint.field, fieldPath));
}

/**
 * A one-element array compares as its element.
 *
 * @remarks
 * Single-selection controls (checkbox group, multi-select) hold `['sports']` rather
 * than `'sports'`, so an authored `equals: 'sports'` would never match. Radiant
 * applied this unwrap and React did not, which made the same config behave
 * differently per renderer; the shared rule is Radiant's.
 */
function normalizeWatchedValue(value: unknown): unknown {
	return Array.isArray(value) && value.length === 1 ? value[0] : value;
}

export interface EvaluateConstraintsInput {
	constraints?: readonly ConstraintLogic[];
	/** Nested value tree for the whole form. Paths are read with {@link getValueAtPath}. */
	values: Record<string, unknown>;
	/** Path of the field declaring the constraints; scopes sibling lookups. */
	fieldPath?: string;
	baseRequired?: boolean;
}

/**
 * Evaluates a field's constraints against the form's value tree.
 *
 * @remarks
 * Resolution and evaluation are deliberately one call: when they were separate,
 * each renderer had to reproduce the "map authored field name to value path" step
 * itself, and they drifted. Callers pass the value tree, not a pre-resolved map.
 *
 * Multiple `show` constraints are OR'ed, then any matching `hide` wins. `enable`
 * disables when its condition is *not* met. `require` is OR'ed with `baseRequired`.
 */
export function evaluateConstraints({
	constraints = [],
	values,
	fieldPath,
	baseRequired = false,
}: EvaluateConstraintsInput): ConstraintEvaluationResult {
	const fieldValues: Record<string, unknown> = {};
	for (const constraint of constraints) {
		fieldValues[constraint.field] = getValueAtPath(values, resolveConstraintPath(constraint.field, fieldPath));
	}

	return evaluateResolvedConstraints(constraints, fieldValues, baseRequired);
}

/**
 * Evaluates constraints against values already keyed by authored field name.
 *
 * @remarks
 * Separate from {@link evaluateConstraints} for callers that subscribe to paths
 * themselves and therefore hold the values keyed by name, not a value tree.
 */
export function evaluateResolvedConstraints(
	constraints: readonly ConstraintLogic[] = [],
	fieldValues: Record<string, unknown>,
	baseRequired = false,
): ConstraintEvaluationResult {
	const normalized: Record<string, unknown> = {};
	for (const constraint of constraints) {
		normalized[constraint.field] = normalizeWatchedValue(fieldValues[constraint.field]);
	}

	return {
		shouldShow: evaluateVisibility(constraints, normalized),
		shouldDisable: evaluateDisabled(constraints, normalized),
		isRequired: evaluateRequired(constraints, normalized, baseRequired),
	};
}

function evaluateVisibility(constraints: readonly ConstraintLogic[], fieldValues: Record<string, unknown>): boolean {
	if (constraints.length === 0) return true;

	const showConstraints = constraints.filter((c) => c.action === 'show');
	const hideConstraints = constraints.filter((c) => c.action === 'hide');

	if (showConstraints.length > 0) {
		const anyShow = showConstraints.some((constraint) =>
			evaluateConstraint(constraint, fieldValues[constraint.field]),
		);

		if (!anyShow) return false;
	}

	if (hideConstraints.length > 0) {
		const anyHide = hideConstraints.some((constraint) =>
			evaluateConstraint(constraint, fieldValues[constraint.field]),
		);

		if (anyHide) return false;
	}

	return true;
}

function evaluateDisabled(constraints: readonly ConstraintLogic[], fieldValues: Record<string, unknown>): boolean {
	return constraints.some((constraint) => {
		const conditionMet = evaluateConstraint(constraint, fieldValues[constraint.field]);

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

function evaluateRequired(
	constraints: readonly ConstraintLogic[],
	fieldValues: Record<string, unknown>,
	baseRequired: boolean,
): boolean {
	const hasRequireAction = constraints.some(
		(constraint) =>
			constraint.action === 'require' && evaluateConstraint(constraint, fieldValues[constraint.field]),
	);

	return baseRequired || hasRequireAction;
}

/**
 * Parameters for {@link ConstraintEvaluator.evaluate}.
 *
 * @deprecated Use {@link EvaluateConstraintsInput}, which takes the value tree
 * instead of a map the caller has already resolved.
 */
export interface EvaluateConstraintsParams {
	constraints?: readonly ConstraintLogic[];
	fieldValues: Record<string, any>;
	baseRequired?: boolean;
}

/**
 * Framework-agnostic constraint logic evaluator.
 *
 * @deprecated Use {@link evaluateConstraints} with the form's value tree, or
 * {@link evaluateResolvedConstraints} when values are already keyed by field name.
 * The class carries no state and its `fieldValues` contract — a map keyed by
 * authored field name rather than by value path — was the reason both renderers
 * reimplemented path resolution.
 */
export class ConstraintEvaluator {
	evaluate({ constraints = [], fieldValues, baseRequired = false }: EvaluateConstraintsParams) {
		return evaluateResolvedConstraints(constraints, fieldValues, baseRequired);
	}
}

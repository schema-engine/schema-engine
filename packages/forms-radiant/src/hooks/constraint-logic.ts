import { ConstraintEvaluator } from '@schema-engine/forms/constraints';
import { getValueAtPath } from '@/lib/path-utils';

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

export function evaluateConstraintLogic(
	constraints: FormEngine.ElementConfig['constraints'] = [],
	baseRequired = false,
	fieldPath?: string,
	values: Record<string, unknown> = {},
) {
	const evaluator = new ConstraintEvaluator();
	const fieldValues: Record<string, unknown> = {};

	for (const constraint of constraints ?? []) {
		const resolved = resolveConstraintField(constraint.field, fieldPath);
		fieldValues[constraint.field] = getValueAtPath(values, resolved);
	}

	return evaluator.evaluate({
		constraints: constraints ?? [],
		fieldValues: fieldValues as Record<string, any>,
		baseRequired,
	});
}

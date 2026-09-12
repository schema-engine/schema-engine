import { ConstraintEvaluator } from '@schema-engine/forms/constraints';
import { getValueAtPath } from '@schema-engine/forms/lib/path-values';

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

function normalizeConstraintValue(value: unknown): unknown {
	return Array.isArray(value) && value.length === 1 ? value[0] : value;
}

export function evaluateConstraintLogic(
	constraints: ReadonlyArray<NonNullable<FormEngine.ElementConfig['constraints']>[number]> = [],
	baseRequired = false,
	fieldPath?: string,
	values: Record<string, unknown> = {},
) {
	const evaluator = new ConstraintEvaluator();
	const fieldValues: Record<string, unknown> = {};

	for (const constraint of constraints ?? []) {
		const resolved = resolveConstraintField(constraint.field, fieldPath);
		fieldValues[constraint.field] = normalizeConstraintValue(getValueAtPath(values, resolved));
	}

	return evaluator.evaluate({
		constraints: constraints ?? [],
		fieldValues: fieldValues as Record<string, any>,
		baseRequired,
	});
}

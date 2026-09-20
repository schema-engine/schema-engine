import { evaluateConstraints } from '@schema-engine/forms/constraints';
import type { ConstraintLogic } from '@schema-engine/forms/schemas';

/**
 * Evaluates a field's constraints against a snapshot of the form's value tree.
 *
 * @remarks
 * Path resolution and the one-element-array rule live in
 * `@schema-engine/forms/constraints` so both renderers share them; this wrapper
 * only adapts the argument order the Radiant call sites use.
 */
export function evaluateConstraintLogic(
	constraints: ReadonlyArray<ConstraintLogic> = [],
	baseRequired = false,
	fieldPath?: string,
	values: Record<string, unknown> = {},
) {
	return evaluateConstraints({ constraints, values, fieldPath, baseRequired });
}

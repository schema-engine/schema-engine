import type { FieldErrors, FieldValues } from 'react-hook-form';
import { setValueAtPath } from '@schema-engine/forms/lib/path-values';

/**
 * Converts the engine's flat errors to the nested `FieldErrors` React Hook Form reads.
 *
 * @remarks
 * A container's error is written first, so an error on `contacts` and one on `contacts.0.email` share
 * one nested node, as React Hook Form's own shape requires.
 */
export function toFieldErrors(errors: Readonly<Record<string, { type: string; message: string }>>): FieldErrors {
	const nested: Record<string, unknown> = {};
	for (const [path, error] of Object.entries(errors).toSorted(
		([a], [b]) => a.split('.').length - b.split('.').length,
	)) {
		setValueAtPath(nested, path, { ...error });
	}
	return nested as FieldErrors<FieldValues>;
}

function collect(node: unknown, path: string, out: Record<string, unknown>): void {
	if (typeof node !== 'object' || node === null) return;
	const recorded =
		('message' in node && typeof node.message === 'string') || ('type' in node && typeof node.type === 'string');
	if (recorded && path) out[path] = node;
	for (const [key, child] of Object.entries(node)) {
		if (key === 'ref' || key === 'types') continue;
		collect(child, path ? `${path}.${key}` : key, out);
	}
}

/**
 * Converts the nested `FieldErrors` React Hook Form holds to the engine's flat errors.
 *
 * @remarks
 * A node is an error when it carries a string `type` or `message`. Empty containers and array holes,
 * which React Hook Form leaves where a nested error was cleared, record nothing.
 */
export function fromFieldErrors(errors: FieldErrors): Record<string, unknown> {
	const flat: Record<string, unknown> = {};
	collect(errors, '', flat);
	return flat;
}

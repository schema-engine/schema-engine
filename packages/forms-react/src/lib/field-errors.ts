import type { FieldErrors, FieldValues } from 'react-hook-form';
import { getValueAtPath, setValueAtPath } from '@schema-engine/forms/lib/path-values';

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

const hasMessage = (node: unknown): boolean =>
	typeof node === 'object' && node !== null && 'message' in node && typeof node.message === 'string';

function collect(node: unknown, path: string, out: Record<string, unknown>): void {
	if (typeof node !== 'object' || node === null) return;
	const recorded =
		('message' in node && typeof node.message === 'string') || ('type' in node && typeof node.type === 'string');
	if (recorded && path) out[path] = node;
	for (const [key, child] of Object.entries(node)) {
		if (recorded && (key === 'ref' || key === 'types') && !hasMessage(child)) continue;
		collect(child, path ? `${path}.${key}` : key, out);
	}
}

/**
 * Converts the nested `FieldErrors` React Hook Form holds to the engine's flat errors.
 *
 * @remarks
 * A node is an error when it carries a string `type` or `message`; its `ref` and `types` belong to the error,
 * not to a field below it, unless the child itself carries a message, which a DOM element and a map of
 * messages by rule do not. Empty containers and array holes, which React Hook Form leaves where a nested
 * error was cleared, record nothing. React Hook Form keeps the error of a field array itself at
 * `<array>.root`, so a `root` below an array in `values` is that array's own error.
 */
export function fromFieldErrors(errors: FieldErrors, values: unknown): Record<string, unknown> {
	const nested: Record<string, unknown> = {};
	collect(errors, '', nested);
	const flat: Record<string, unknown> = {};
	for (const [path, error] of Object.entries(nested)) {
		const parent = path.endsWith('.root') ? path.slice(0, -'.root'.length) : undefined;
		flat[parent !== undefined && Array.isArray(getValueAtPath(values, parent)) ? parent : path] = error;
	}
	return flat;
}

import type { FieldErrors, FieldValues } from 'react-hook-form';
import type { FormStateError } from '@schema-engine/forms/types';
import { getValueAtPath, setValueAtPath } from '@schema-engine/forms/lib/path-values';

/**
 * Converts the engine's flat errors to the nested `FieldErrors` React Hook Form reads.
 *
 * @remarks
 * React Hook Form keeps one error per field, so only the error to show crosses, not the rest of `all`.
 *
 * A container's error is written first, so an error on `contacts` and one on `contacts.0.email` share
 * one nested node, as React Hook Form's own shape requires.
 */
export function toFieldErrors(errors: Readonly<Record<string, { type: string; message: string }>>): FieldErrors {
	const nested: Record<string, unknown> = {};
	for (const [path, error] of Object.entries(errors).toSorted(
		([a], [b]) => a.split('.').length - b.split('.').length,
	)) {
		setValueAtPath(nested, path, { type: error.type, message: error.message });
	}
	return nested as FieldErrors<FieldValues>;
}

/** The engine's error for what React Hook Form recorded: one issue, from the validation, with the fields it carries. */
function toStateError(node: { type?: unknown; message?: unknown }): FormStateError {
	const issue = {
		type: typeof node.type === 'string' ? node.type : 'validation',
		source: 'validation' as const,
		...(typeof node.message === 'string' ? { message: node.message } : {}),
	};
	return { ...issue, all: [issue] };
}

function collect(node: unknown, path: string, out: Record<string, FormStateError>): void {
	if (typeof node !== 'object' || node === null) return;
	const recorded =
		('message' in node && typeof node.message === 'string') || ('type' in node && typeof node.type === 'string');
	if (recorded && path) out[path] = toStateError(node);
	for (const [key, child] of Object.entries(node)) {
		if (recorded && (key === 'ref' || key === 'types')) continue;
		collect(child, path ? `${path}.${key}` : key, out);
	}
}

/**
 * Converts the nested `FieldErrors` React Hook Form holds to the engine's flat errors.
 *
 * @remarks
 * A node is an error when it carries a string `type` or `message`. `ref` and `types` are reserved keys of
 * an error in React Hook Form, so below a node that is an error they are its metadata, never fields; a
 * field of those names is read where no error of its own surrounds it. React Hook Form's own nesting cannot
 * hold both, which is a limit of this adapter, not of the engine. Empty containers and array holes, which React Hook Form leaves where a nested
 * error was cleared, record nothing. React Hook Form keeps the error of a field array itself at
 * `<array>.root`, so a `root` below an array in `values` is that array's own error.
 */
export function fromFieldErrors(errors: FieldErrors, values: unknown): Record<string, FormStateError> {
	const nested: Record<string, FormStateError> = {};
	collect(errors, '', nested);
	const flat: Record<string, FormStateError> = {};
	for (const [path, error] of Object.entries(nested)) {
		const parent = path.endsWith('.root') ? path.slice(0, -'.root'.length) : undefined;
		flat[parent !== undefined && Array.isArray(getValueAtPath(values, parent)) ? parent : path] = error;
	}
	return flat;
}

/**
 * Converts the nested `touchedFields` React Hook Form holds to the engine's flat touched map.
 *
 * @remarks Array holes, which React Hook Form leaves for rows that were never touched, record nothing.
 */
export function fromTouchedFields(
	touched: unknown,
	path = '',
	out: Record<string, boolean> = {},
): Record<string, boolean> {
	if (touched === true) {
		if (path) out[path] = true;
	} else if (typeof touched === 'object' && touched !== null) {
		for (const [key, child] of Object.entries(touched))
			fromTouchedFields(child, path ? `${path}.${key}` : key, out);
	}
	return out;
}

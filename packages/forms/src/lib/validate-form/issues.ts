import type { FormTaggedConfig } from '@/schemas/form-config.js';
import { ELEMENT_CHILDREN_KEY } from '@/lib/element-children.js';

/**
 * One problem found while validating a form, shaped like a Standard Schema issue.
 *
 * @remarks
 * `path` names the config key the issue is about, in object keys and array indexes, for example
 * `['steps', 0, 'elements', 2, 'grid', 'width']`. An issue about the whole form has the path `[]`.
 * A path is always plain keys, so a `PathSegment` from a schema issue is flattened to its key.
 *
 * `code` and `params` are set on an issue a schema reported, so an editor can localize a diagnostic
 * from the code and its parameters rather than from the English `message`. `code` is the schema
 * library's own (`too_small`, `invalid_value`, `invalid_type`, `invalid_format`, `unrecognized_keys`
 * for Zod), and `params` holds the details that code reports, such as `minimum`, `values`, `expected`
 * or `keys`. An issue the engine finds itself (a cascade check, an unknown `$type`) has neither. A
 * consumer that only reads `message` and `path` is unaffected, and the shape still satisfies the
 * Standard Schema issue the YAML layer takes.
 */
export interface FormValidationIssue {
	readonly message: string;
	readonly path: ReadonlyArray<PropertyKey>;
	readonly code?: string;
	readonly params?: Readonly<Record<string, unknown>>;
}

/** What {@link safeValidateFormConfig} returns: the normalized form, or the issues found. */
export type FormValidationResult<T> = { success: true; data: T } | { success: false; issues: FormValidationIssue[] };

export type Path = ReadonlyArray<PropertyKey>;

export function issueAt(
	path: Path,
	message: string,
	schemaIssue?: Pick<FormValidationIssue, 'code' | 'params'>,
): FormValidationIssue {
	return schemaIssue?.code === undefined ? { path, message } : { path, message, ...schemaIssue };
}

export function childPath(parent: Path, index: number): Path {
	return [...parent, ELEMENT_CHILDREN_KEY, index];
}

export function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null;
}

export type ParseResult<T> = { ok: true; data: T } | { ok: false; issues: FormValidationIssue[] };

export function isTaggedConfig(value: unknown): value is FormTaggedConfig {
	return typeof value === 'object' && value !== null && '$type' in value && typeof value.$type === 'string';
}

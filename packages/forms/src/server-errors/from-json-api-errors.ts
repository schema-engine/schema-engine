import { FORM_ROOT, type FormStateErrorsInput } from '@/state-container/types';
import {
	groupByPath,
	isRecord,
	issueOf,
	pointerToPath,
	recordsAt,
	serializableParams,
	ServerErrorsInputError,
	textOf,
} from './shared';

/** The members of a JSON Pointer that locate an attribute in a JSON:API resource, which are not part of a field's path. */
const ATTRIBUTES = ['data', 'attributes'];

/**
 * The input of `setServerErrors` for a JSON:API error document.
 *
 * @remarks
 * Reads `errors[]`: `source.pointer` is a JSON Pointer to the dotted path, without a leading `/data/attributes`,
 * and no pointer means the form ({@link FORM_ROOT}). An issue's `type` is its `code`, its `message` its `detail`,
 * and the plain serializable members of its `meta` become `params`. Several errors on one path become a list.
 * Reads no text of its own: `title` and `status` are not carried.
 *
 * @throws {ServerErrorsInputError} For input that is not an object with an `errors` list of objects, for a `source` that is not an object, and for a pointer that is not one or names a reserved segment.
 */
export function fromJsonApiErrors(document: unknown): FormStateErrorsInput {
	const entries = isRecord(document) ? recordsAt(document, 'errors', 'JSON:API member') : undefined;
	if (entries === undefined)
		throw new ServerErrorsInputError('A JSON:API error document is an object with an errors list.');
	return groupByPath(
		entries.map((entry) => {
			const source: unknown = entry.source;
			if (source !== undefined && !isRecord(source)) {
				throw new ServerErrorsInputError("A JSON:API error 'source' must be an object.");
			}
			const pointer = isRecord(source) ? textOf(source.pointer) : undefined;
			return [
				pointer === undefined ? FORM_ROOT : pointerToPath(pointer, ATTRIBUTES),
				issueOf({
					type: textOf(entry.code),
					message: textOf(entry.detail),
					params: isRecord(entry.meta) ? serializableParams(entry.meta, new Set()) : undefined,
				}),
			] as const;
		}),
	);
}

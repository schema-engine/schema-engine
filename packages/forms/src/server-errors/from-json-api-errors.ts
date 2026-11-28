import { FORM_ROOT, type FormStateErrorsInput } from '../state-container/types.js';
import {
	groupByPath,
	isRecord,
	issueOf,
	pointerToPath,
	recordsAt,
	serializableParams,
	ServerErrorsInputError,
	textOf,
} from './shared.js';

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
 * @throws {ServerErrorsInputError} For input that is not an object with an `errors` list of objects, for an error with none of `source.pointer`, `detail` and `code`, for a `source` that is not an object, for a `source.pointer` that is not a string, and for a pointer that is not one or names a reserved segment.
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
			const given: unknown = isRecord(source) ? source.pointer : undefined;
			if (given !== undefined && typeof given !== 'string') {
				throw new ServerErrorsInputError("A JSON:API error 'source.pointer' must be a string.");
			}
			if (given === undefined && entry.detail === undefined && entry.code === undefined) {
				throw new ServerErrorsInputError(
					"A JSON:API error has none of 'source.pointer', 'detail' and 'code': nothing says what it is about.",
				);
			}
			const pointer = textOf(given);
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

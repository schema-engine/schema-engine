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

const KNOWN = ['type', 'title', 'status', 'detail', 'instance', 'errors'];
const ENTRY_MEMBERS: ReadonlySet<string> = new Set(['pointer', 'detail', 'code']);

/** The RFC 9457 default for a problem with no `type`; it names no kind of problem. */
const ABOUT_BLANK = 'about:blank';

/**
 * The input of `setServerErrors` for an RFC 9457 Problem Details response.
 *
 * @remarks
 * Reads the common `errors` extension, a list of `{ pointer?, detail?, code?, ...extra }`: `pointer` is a JSON
 * Pointer (RFC 6901, plain or as a URI fragment) that becomes the dotted path, and no pointer means the form
 * ({@link FORM_ROOT}). An issue's `type` is its `code`, else the problem's `type` (`about:blank` names none), its
 * `message` is its `detail`, and the other members become `params` when they are plain serializable values.
 * Several errors on one path become a list. A problem with no `errors` is one issue on the form, with the
 * problem's `type` and `detail`. Reads no text of its own: `title` and `status` are not carried.
 *
 * @throws {ServerErrorsInputError} For input that is not an object with a recognisable member, for an `errors` that is not a list of objects, and for a pointer that is not one or names a reserved segment.
 */
export function fromProblemDetails(problem: unknown): FormStateErrorsInput {
	if (!isRecord(problem) || !KNOWN.some((key) => Object.hasOwn(problem, key))) {
		throw new ServerErrorsInputError(
			'A Problem Details response is an object with a type, title, status, detail or errors.',
		);
	}
	const kind = problem.type === ABOUT_BLANK ? undefined : textOf(problem.type);
	const entries = recordsAt(problem, 'errors', 'Problem Details member');
	if (entries === undefined || entries.length === 0) {
		return { [FORM_ROOT]: issueOf({ type: kind, message: textOf(problem.detail) }) };
	}
	return groupByPath(
		entries.map((entry) => {
			const pointer = textOf(entry.pointer);
			return [
				pointer === undefined ? FORM_ROOT : pointerToPath(pointer),
				issueOf({
					type: textOf(entry.code) ?? kind,
					message: textOf(entry.detail),
					params: serializableParams(entry, ENTRY_MEMBERS),
				}),
			] as const;
		}),
	);
}

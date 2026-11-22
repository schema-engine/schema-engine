import { isPlainObject } from '@/lib/is-plain-object';
import { isReservedPathKey } from '@/lib/reserved-path-keys';
import { FORM_ROOT, type FormStateErrorInput, type FormStateErrorsInput } from '@/state-container/types';

/**
 * Thrown by the server error helpers for input whose shape they do not recognise, or that names a path no field can have.
 *
 * @remarks The helpers never guess: a response they cannot read is an outage for the host to handle, not a field error.
 */
export class ServerErrorsInputError extends Error {
	override readonly name = 'ServerErrorsInputError';
}

export const isRecord = isPlainObject;

/** The members of `value` that `JSON.stringify` keeps as they are, which is what an issue's `params` may hold. */
function isSerializable(value: unknown): boolean {
	if (value === null || typeof value === 'string' || typeof value === 'boolean') return true;
	if (typeof value === 'number') return Number.isFinite(value);
	if (Array.isArray(value)) return value.every(isSerializable);
	return isPlainObject(value) && Object.values(value).every(isSerializable);
}

/** The members of `source` outside `omit` that are plain serializable values, or `undefined` when none are. */
export function serializableParams(
	source: Readonly<Record<string, unknown>>,
	omit: ReadonlySet<string>,
): Readonly<Record<string, unknown>> | undefined {
	const kept = Object.entries(source).filter(([key, value]) => !omit.has(key) && isSerializable(value));
	return kept.length === 0 ? undefined : Object.fromEntries(kept);
}

/** The text of `value` when it is a non-empty string. */
export const textOf = (value: unknown): string | undefined =>
	typeof value === 'string' && value.length > 0 ? value : undefined;

/**
 * The dotted path of a JSON Pointer (RFC 6901), in its plain or URI fragment form (`#/a/0/b`).
 *
 * @remarks
 * An empty pointer names the whole document, so the form. A segment is unescaped (`~1` is `/`, `~0` is `~`),
 * and one that holds a `.` cannot be a field name in a dotted path. `skip` lists leading segments that are not
 * part of the path, such as `data` and `attributes` of a JSON:API document.
 */
export function pointerToPath(pointer: string, skip: readonly string[] = []): string {
	const raw = pointer.startsWith('#') ? decodeFragment(pointer.slice(1)) : pointer;
	if (raw === '') return FORM_ROOT;
	if (!raw.startsWith('/')) throw new ServerErrorsInputError(`'${pointer}' is not a JSON Pointer.`);
	const segments = raw
		.slice(1)
		.split('/')
		.map((segment) => segment.replaceAll('~1', '/').replaceAll('~0', '~'));
	const own = segments.every((segment, index) => segment === skip[index])
		? []
		: skip.every((name, index) => segments[index] === name)
			? segments.slice(skip.length)
			: segments;
	for (const segment of own) {
		if (segment === '') throw new ServerErrorsInputError(`'${pointer}' has an empty segment.`);
		if (segment.includes('.'))
			throw new ServerErrorsInputError(
				`'${pointer}' has the segment '${segment}', which a dotted path cannot hold.`,
			);
		if (isReservedPathKey(segment)) {
			throw new ServerErrorsInputError(
				`'${pointer}' has the reserved segment '${segment}'; a segment cannot start with '__' or be constructor, prototype or __proto__.`,
			);
		}
	}
	return own.length === 0 ? FORM_ROOT : own.join('.');
}

function decodeFragment(fragment: string): string {
	try {
		return decodeURIComponent(fragment);
	} catch {
		throw new ServerErrorsInputError(`'#${fragment}' is not a valid URI fragment.`);
	}
}

/** Collects issues by path: one stays an issue, several become a list in the order they came. */
export function groupByPath(found: ReadonlyArray<readonly [string, FormStateErrorInput]>): FormStateErrorsInput {
	const grouped = new Map<string, FormStateErrorInput[]>();
	for (const [path, issue] of found) grouped.set(path, [...(grouped.get(path) ?? []), issue]);
	return Object.fromEntries(
		[...grouped].map(([path, issues]) => [path, issues.length === 1 ? issues[0] : issues] as const),
	);
}

/** An issue with only the parts that are there. */
export function issueOf(parts: {
	readonly type?: string;
	readonly message?: string;
	readonly params?: Readonly<Record<string, unknown>>;
}): FormStateErrorInput {
	return {
		...(parts.type === undefined ? {} : { type: parts.type }),
		...(parts.message === undefined ? {} : { message: parts.message }),
		...(parts.params === undefined ? {} : { params: parts.params }),
	};
}

/** The list at `key` of `source`, which must be an array of records when it is there. */
export function recordsAt(
	source: Readonly<Record<string, unknown>>,
	key: string,
	what: string,
): ReadonlyArray<Readonly<Record<string, unknown>>> | undefined {
	const list: unknown = source[key];
	if (list === undefined) return undefined;
	if (!Array.isArray(list)) throw new ServerErrorsInputError(`${what} '${key}' must be an array.`);
	return list.map((entry: unknown, index) => {
		if (!isRecord(entry)) throw new ServerErrorsInputError(`${what} '${key}[${index}]' must be an object.`);
		return entry;
	});
}

import { isPathExcluded } from '@/engine/value-validation';
import { frozenCopy } from '@/lib/frozen-copy';
import type { IdTree } from './row-ids';
import { getValueAtPath } from '@/lib/path-values';
import { join, toInternalRecord, toPlainRecord, type NullMap } from './value-tree';
import { pickDeclared, type ObjectShape } from '@/lib/submission-shape';

/**
 * What the container keeps of one `submit()`: the values it is about, and how its validation ended.
 *
 * @remarks Mutable and private to the container. The host only ever sees the {@link FormSubmitResult} built from it.
 */
export interface SubmissionRecord {
	values: NullMap;
	ids: IdTree | undefined;
	/** The paths that took no part when `values` were captured. */
	excluded: readonly string[];
	/** The data that travels with every submission, from the form config. */
	readonly payload: Readonly<Record<string, unknown>>;
	/** What the form's fields declare: a key of `values` outside it is not submitted. */
	readonly shape: ObjectShape;
	readonly epoch: number;
	/** The values to submit, built from the fields above and reused while they are the same. */
	view?: {
		readonly values: NullMap;
		readonly excluded: readonly string[];
		readonly plain: Readonly<Record<string, unknown>>;
		readonly tree: NullMap;
	};
}

/** `value` without the paths `excluded` lists, an excluded row of an array dropped from it. */
function omitExcluded(value: unknown, excluded: readonly string[], path = ''): unknown {
	const at = (key: string | number) => (path ? `${path}.${key}` : String(key));
	if (Array.isArray(value)) {
		return value.flatMap((item, index) =>
			isPathExcluded(excluded, at(index)) ? [] : [omitExcluded(item, excluded, at(index))],
		);
	}
	if (typeof value === 'object' && value !== null && Object.getPrototypeOf(value) === Object.prototype) {
		return Object.fromEntries(
			Object.entries(value).flatMap(([key, child]) =>
				isPathExcluded(excluded, at(key)) ? [] : [[key, omitExcluded(child, excluded, at(key))]],
			),
		);
	}
	return value;
}

/** `values` without the paths `excluded` lists, as a record. */
const omitExcludedFrom = (
	values: Readonly<Record<string, unknown>>,
	excluded: readonly string[],
): Record<string, unknown> =>
	Object.fromEntries(
		Object.entries(values).flatMap(([key, child]) =>
			isPathExcluded(excluded, key) ? [] : [[key, omitExcluded(child, excluded, key)]],
		),
	);

function viewOf(record: SubmissionRecord): NonNullable<SubmissionRecord['view']> {
	const { values, excluded, payload, shape } = record;
	if (record.view?.values === values && record.view.excluded === excluded) return record.view;
	const kept = pickDeclared(shape, omitExcludedFrom(toPlainRecord(values), excluded)) as Record<string, unknown>;
	const view = {
		values,
		excluded,
		plain: Object.freeze({ ...kept, ...frozenCopy(payload) }),
		tree: toInternalRecord(kept),
	};
	record.view = view;
	return view;
}

/**
 * The values a submission submits: those captured that a field declares, without the paths that took no part, and the payload.
 *
 * @remarks
 * The same frozen object while the captured values are the same. A row that took no part is left out of its array,
 * so an index in these values can differ from the row's index in the form. `setServerErrors` takes paths as they
 * are in these values and maps them to the form's rows itself (see {@link toFormPath}).
 */
export const submittedValues = (record: SubmissionRecord): Readonly<Record<string, unknown>> => viewOf(record).plain;

/** The submitted values as the container holds them, without the payload: what a path of `setServerErrors` is read against. */
export const submittedTree = (record: SubmissionRecord): NullMap => viewOf(record).tree;

/**
 * The path in the form, as it was when the submission was captured, of a path in the submitted values.
 *
 * @remarks
 * An index into an array counts only the rows that took part, so with the middle row of three left out, submitted
 * row `1` is the form's row `2`. The path must name rows the submitted values have.
 */
export function toFormPath(record: SubmissionRecord, path: string): string {
	return path === ''
		? ''
		: path.split('.').reduce((full, segment) => {
				const node: unknown = full === '' ? record.values : getValueAtPath(record.values, full);
				if (!Array.isArray(node)) return join(full, segment);
				const kept = node.flatMap((_, row) =>
					isPathExcluded(record.excluded, join(full, String(row))) ? [] : [row],
				);
				return join(full, String(kept[Number(segment)]));
			}, '');
}

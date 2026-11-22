import { isPathExcluded } from '@/engine/value-validation';
import { frozenCopy } from '@/lib/frozen-copy';
import type { IdTree } from './row-ids';
import { toPlain, type NullMap } from './value-tree';
import type { FormSubmitResult } from './types';

/**
 * What the container keeps of one `submit()`: the values it is about, and how its validation ended.
 *
 * @remarks Mutable and private to the container. The host only ever sees the {@link FormSubmitResult} built from it.
 */
export interface SubmissionRecord {
	outcome: FormSubmitResult['outcome'] | undefined;
	values: NullMap;
	ids: IdTree | undefined;
	/** The paths that took no part when `values` were captured. */
	excluded: readonly string[];
	/** The data that travels with every submission, from the form config. */
	readonly payload: Readonly<Record<string, unknown>>;
	readonly epoch: number;
	/** The values to submit, built from the fields above and reused while they are the same. */
	view?: {
		readonly values: NullMap;
		readonly excluded: readonly string[];
		readonly plain: Readonly<Record<string, unknown>>;
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

/**
 * The values a submission submits: those captured, without the paths that took no part, and the payload.
 *
 * @remarks
 * The same frozen object while the captured values are the same. A row that took no part is left out of its array,
 * so an index in these values can differ from the row's index in the form. `setServerErrors` addresses rows by
 * their index in the form when it was submitted, excluded rows counted, not by an index in these values: a server
 * that answers by the index it saw in the submitted values must map it back when rows were excluded.
 */
export function submittedValues(record: SubmissionRecord): Readonly<Record<string, unknown>> {
	const { values, excluded, payload } = record;
	if (record.view?.values === values && record.view.excluded === excluded) return record.view.plain;
	const kept = omitExcluded(toPlain(values), excluded) as Record<string, unknown>;
	const plain = Object.freeze({ ...kept, ...frozenCopy(payload) });
	record.view = { values, excluded, plain };
	return plain;
}

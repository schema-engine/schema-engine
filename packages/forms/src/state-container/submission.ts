import { isPathExcluded } from '@/engine/value-validation';
import { frozenCopy } from '@/lib/frozen-copy';
import type { IdTree } from './row-ids';
import { toPlain, type NullMap } from './value-tree';
import type { SubmissionOutcome, SubmissionToken } from './types';

/** What a submission holds for the container: the values it is about, and how its last validation ended. */
export interface SubmissionRecord {
	outcome: SubmissionOutcome | undefined;
	values: NullMap;
	ids: IdTree | undefined;
	/** The paths that took no part when `values` were captured. */
	excluded: readonly string[];
	/** The data that travels with every submission, from the form config. */
	readonly payload: Readonly<Record<string, unknown>>;
	readonly epoch: number;
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
 * The token {@link FormStateContainer.beginSubmission} returns.
 *
 * @remarks
 * The record is a private field, so only a token the container made is one it accepts: `recordOf` finds it
 * with a brand check and answers `undefined` for anything else, with no registry to keep and no cast.
 */
export class Submission implements SubmissionToken {
	readonly #record: SubmissionRecord;
	#view:
		| {
				readonly values: NullMap;
				readonly excluded: readonly string[];
				readonly plain: Readonly<Record<string, unknown>>;
		  }
		| undefined;

	constructor(record: SubmissionRecord) {
		this.#record = record;
	}

	/**
	 * The values to submit: those captured, without the paths that took no part, and the payload.
	 *
	 * @remarks The same frozen object while the captured values are the same.
	 */
	get values(): Readonly<Record<string, unknown>> {
		const { values, excluded, payload } = this.#record;
		if (this.#view?.values === values && this.#view.excluded === excluded) return this.#view.plain;
		const kept = omitExcluded(toPlain(values), excluded) as Record<string, unknown>;
		const plain = Object.freeze({ ...kept, ...frozenCopy(payload) });
		this.#view = { values, excluded, plain };
		return plain;
	}

	get outcome(): SubmissionOutcome | undefined {
		return this.#record.outcome;
	}

	/** The record behind a token this container made, or `undefined` for any other value. */
	static recordOf(token: object | undefined): SubmissionRecord | undefined {
		return token !== undefined && #record in token ? token.#record : undefined;
	}
}

import type { IdTree } from './row-ids';
import { toPlain, type NullMap } from './value-tree';
import type { SubmissionOutcome, SubmissionToken } from './types';

/** What a submission holds for the container: the values it is about, and how its last validation ended. */
export interface SubmissionRecord {
	outcome: SubmissionOutcome | undefined;
	values: NullMap;
	ids: IdTree | undefined;
	readonly epoch: number;
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

	constructor(record: SubmissionRecord) {
		this.#record = record;
		Object.freeze(this);
	}

	get values(): Readonly<Record<string, unknown>> {
		return toPlain(this.#record.values) as Readonly<Record<string, unknown>>;
	}

	get outcome(): SubmissionOutcome | undefined {
		return this.#record.outcome;
	}

	/** The record behind a token this container made, or `undefined` for any other value. */
	static recordOf(token: object | undefined): SubmissionRecord | undefined {
		return token !== undefined && #record in token ? token.#record : undefined;
	}
}

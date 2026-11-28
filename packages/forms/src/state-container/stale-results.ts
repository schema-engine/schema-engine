import type { RowAnchor } from './row-ids.js';
import { isWithin } from './value-tree.js';

/** One recorded validation, as the tracker sees it. */
export interface ValidationRun {
	readonly seq: number;
	readonly epoch: number;
}

/**
 * Decides whether a recorded validation result is overtaken by something that is not a value change.
 *
 * @remarks
 * A result is superseded for a path when a validation that started later asked for that path, which is
 * "the latest requester wins", or when the form was reset after the run started. What a validation asked
 * for is kept as row anchors, and resolved against the rows as they are when the question is asked, so
 * the answer follows rows that moved. Values, dependencies and rows are the container's to check.
 */
export interface RunTracker {
	/** `scope` is what the run asked for, as anchors; `undefined` is the whole form. */
	start(scope: readonly RowAnchor[] | undefined, exact: boolean): ValidationRun;
	reset(): void;
	/** How many resets there have been: a number a submission keeps to tell whether the form was reset after it began. */
	epoch(): number;
	/** Whether the form was reset after `run` started: everything the run found is then moot. */
	outdated(run: ValidationRun): boolean;
	finish(run: ValidationRun): void;
	/** `resolve` finds the path an anchor has now, or `undefined` when its rows are gone. */
	superseded(run: ValidationRun, path: string, resolve: (anchor: RowAnchor) => string | undefined): boolean;
}

interface Request {
	readonly seq: number;
	readonly scope: readonly RowAnchor[] | undefined;
	readonly exact: boolean;
}

export function createRunTracker(): RunTracker {
	let seq = 0;
	let epoch = 0;
	const pending = new Set<ValidationRun>();
	let requests: Request[] = [];

	return {
		start(scope, exact) {
			const run = { seq: ++seq, epoch };
			pending.add(run);
			requests.push({ seq: run.seq, scope, exact });
			return run;
		},
		reset() {
			epoch += 1;
		},
		epoch: () => epoch,
		outdated: (run) => run.epoch !== epoch,
		finish(run) {
			pending.delete(run);
			if (pending.size === 0) requests = [];
		},
		superseded(run, path, resolve) {
			if (run.epoch !== epoch) return true;
			return requests.some((request) => {
				if (request.seq <= run.seq) return false;
				if (!request.scope) return true;
				return request.scope.some((anchor) => {
					const asked = resolve(anchor);
					return asked !== undefined && (request.exact ? asked === path : isWithin(path, asked));
				});
			});
		},
	};
}

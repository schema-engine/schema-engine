import { isWithin } from './value-tree';

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
 * "the latest requester wins", or when the form was reset after the run started. Values, dependencies
 * and rows are the store's to check, as it owns them.
 */
export interface RunTracker {
	start(scope: readonly string[] | undefined, exact: boolean): ValidationRun;
	reset(): void;
	finish(run: ValidationRun): void;
	superseded(run: ValidationRun, path: string): boolean;
}

export function createRunTracker(): RunTracker {
	let seq = 0;
	let epoch = 0;
	let allSeq = 0;
	const pending = new Set<ValidationRun>();
	const prefixSeq = new Map<string, number>();
	const exactSeq = new Map<string, number>();

	return {
		start(scope, exact) {
			const run = { seq: ++seq, epoch };
			pending.add(run);
			if (!scope) allSeq = run.seq;
			else for (const name of scope) (exact ? exactSeq : prefixSeq).set(name, run.seq);
			return run;
		},
		reset() {
			epoch += 1;
		},
		finish(run) {
			pending.delete(run);
			if (pending.size === 0) {
				prefixSeq.clear();
				exactSeq.clear();
			}
		},
		superseded(run, path) {
			if (run.epoch !== epoch || allSeq > run.seq || (exactSeq.get(path) ?? 0) > run.seq) return true;
			for (const [name, later] of prefixSeq) if (later > run.seq && isWithin(path, name)) return true;
			return false;
		},
	};
}

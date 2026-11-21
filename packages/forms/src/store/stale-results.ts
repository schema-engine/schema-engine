import { isWithin } from './value-tree';

/** One recorded validation, as the tracker sees it. */
export interface ValidationRun {
	readonly seq: number;
	readonly tick: number;
}

/**
 * Decides whether a recorded validation result still describes the form.
 *
 * @remarks
 * A result is superseded for a path when a validation that started later asked for that path, which
 * is "the latest requester wins", or when rows at or above the path moved after the run started, or
 * the form was reset. A path's own value and its dependencies are checked by the store, which owns
 * the values.
 */
export interface RunTracker {
	start(scope: readonly string[] | undefined, exact: boolean): ValidationRun;
	/** Records that every path at or below `path` changed identity: a row operation, or a reset (`''`). */
	moved(path: string): void;
	finish(run: ValidationRun): void;
	superseded(run: ValidationRun, path: string): boolean;
}

export function createRunTracker(): RunTracker {
	let seq = 0;
	let tick = 0;
	let allSeq = 0;
	const pending = new Set<ValidationRun>();
	const prefixSeq = new Map<string, number>();
	const exactSeq = new Map<string, number>();
	let changes: Array<{ tick: number; path: string }> = [];

	return {
		start(scope, exact) {
			const run = { seq: ++seq, tick };
			pending.add(run);
			if (!scope) allSeq = run.seq;
			else for (const name of scope) (exact ? exactSeq : prefixSeq).set(name, run.seq);
			return run;
		},
		moved(path) {
			changes.push({ tick: ++tick, path });
		},
		finish(run) {
			pending.delete(run);
			if (pending.size === 0) {
				prefixSeq.clear();
				exactSeq.clear();
				changes = [];
			}
		},
		superseded(run, path) {
			if (allSeq > run.seq || (exactSeq.get(path) ?? 0) > run.seq) return true;
			for (const [name, later] of prefixSeq) if (later > run.seq && isWithin(path, name)) return true;
			return changes.some((change) => change.tick > run.tick && isWithin(path, change.path));
		},
	};
}

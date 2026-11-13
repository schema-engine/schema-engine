/**
 * Most browser test files a Vitest browser project runs at once.
 *
 * @remarks
 * Vitest loads each browser test file in its own iframe of one Chromium page and sends every
 * `userEvent` call to Playwright through a single provider session. With a file per core, a
 * test that types many characters queues one command per keystroke behind every other file's
 * commands, and under CPU contention (a turbo run, or several worktrees running the
 * pre-commit hook) it exceeds the 15 s test timeout. Two files at a time keeps the browser
 * busy without starving a test of its own commands.
 */
export const BROWSER_MAX_WORKERS = 2;

/**
 * Concurrency options for one project of a package that has several Vitest projects.
 *
 * @param groupOrder Position of the project's group; groups run one after another.
 *
 * @remarks
 * Vitest refuses projects with different `maxWorkers` unless each has its own
 * `sequence.groupOrder`. Using one order per project also stops a package's browser and
 * Storybook projects from competing for the CPU at the same time.
 */
export function browserProjectLimits(groupOrder: number) {
	return { maxWorkers: BROWSER_MAX_WORKERS, sequence: { groupOrder } };
}

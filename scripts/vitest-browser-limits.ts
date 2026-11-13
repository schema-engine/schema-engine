/**
 * Most browser test files a Vitest browser project runs at once.
 *
 * @remarks
 * Vitest opens a Playwright page for each worker, so a file per core means that many pages in
 * one Chromium process. Every `userEvent` call is a Playwright call, and `type` makes a
 * keydown and a keyup call for each character. The pages compete for the one Chromium process,
 * the one Playwright connection and the Node event loop, so under CPU contention (a turbo run,
 * or several worktrees running the pre-commit hook) a test that types many characters exceeds
 * the 15 s test timeout. Two files at a time keeps the browser busy without starving a test.
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

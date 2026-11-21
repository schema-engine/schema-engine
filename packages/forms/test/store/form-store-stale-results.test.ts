import { describe, expect, test, vi } from 'vitest';
import { formStoreCases } from '../../../../test-utils/form-store-conformance';
import { createFormStore } from '@/store/create-form-store';

vi.mock('@/store/stale-results', () => ({
	createRunTracker: () => ({
		start: () => ({ seq: 0, tick: 0 }),
		moved: () => undefined,
		finish: () => undefined,
		superseded: () => false,
		movedSince: () => false,
	}),
}));

/**
 * A store whose tracker never calls a result stale is the store the "stale async results" cases exist to catch.
 */
describe('a store that never supersedes an async result', () => {
	test.each(['drops a result that arrives after a reset', 'drops a result for rows that moved while it was running'])(
		'fails "%s"',
		async (name) => {
			const entry = formStoreCases.find((candidate) => candidate.name === name);
			const failure: unknown = await Promise.resolve()
				.then(() => entry?.run(createFormStore))
				.then(
					() => undefined,
					(error: unknown) => error,
				);
			expect((failure as Error | undefined)?.name).toBe('AssertionError');
		},
	);
});

import { describe, expect, test, vi } from 'vitest';
import { formStateContainerCases } from '../../../../test-utils/form-state-container-conformance';
import { createFormStateContainer } from '@/state-container/create-form-state-container';

vi.mock('@/state-container/stale-results', () => ({
	createRunTracker: () => ({
		start: () => ({ seq: 0, epoch: 0 }),
		reset: () => undefined,
		epoch: () => 0,
		outdated: () => false,
		finish: () => undefined,
		superseded: () => false,
	}),
}));

describe('a store whose tracker never supersedes an async result', () => {
	test('fails the case about a late result after a reset', async () => {
		const entry = formStateContainerCases.find(
			(candidate) => candidate.name === 'drops a result that arrives after a reset',
		);
		const failure: unknown = await Promise.resolve()
			.then(() => entry?.run(createFormStateContainer))
			.then(
				() => undefined,
				(error: unknown) => error,
			);
		expect((failure as Error | undefined)?.name).toBe('AssertionError');
	});
});

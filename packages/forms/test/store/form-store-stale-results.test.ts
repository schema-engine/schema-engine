import { describe, expect, test, vi } from 'vitest';
import { formStoreCases } from '../../../../test-utils/form-store-conformance';
import { createFormStore } from '@/store/create-form-store';

vi.mock('@/store/stale-results', () => ({
	createRunTracker: () => ({
		start: () => ({ seq: 0, epoch: 0 }),
		reset: () => undefined,
		finish: () => undefined,
		superseded: () => false,
	}),
}));

describe('a store whose tracker never supersedes an async result', () => {
	test('fails the case about a late result after a reset', async () => {
		const entry = formStoreCases.find(
			(candidate) => candidate.name === 'drops a result that arrives after a reset',
		);
		const failure: unknown = await Promise.resolve()
			.then(() => entry?.run(createFormStore))
			.then(
				() => undefined,
				(error: unknown) => error,
			);
		expect((failure as Error | undefined)?.name).toBe('AssertionError');
	});
});

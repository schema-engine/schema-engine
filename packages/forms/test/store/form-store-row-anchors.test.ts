import { describe, expect, test, vi } from 'vitest';
import { formStoreCases } from '../../../../test-utils/form-store-conformance';
import { createFormStore } from '@/store/create-form-store';

vi.mock('@/store/row-ids', async (importOriginal) => {
	const original = await importOriginal<typeof import('@/store/row-ids')>();
	return { ...original, resolveAnchor: (anchor: { path: string }) => anchor.path };
});

describe('a store that finds a late result by position instead of by row', () => {
	test.each([
		'applies a late result to the row it was for after the rows moved',
		'drops a late result for a row that was removed',
		'drops a late result when its rows were replaced',
		'follows a nested row when the rows around it move',
	])('fails "%s"', async (name) => {
		const entry = formStoreCases.find((candidate) => candidate.name === name);
		const failure: unknown = await Promise.resolve()
			.then(() => entry?.run(createFormStore))
			.then(
				() => undefined,
				(error: unknown) => error,
			);
		expect((failure as Error | undefined)?.name).toBe('AssertionError');
	});
});

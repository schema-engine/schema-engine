import { beforeEach, describe, expect, test, vi } from 'vitest';
import { markNormalizedElementConfig } from '@/lib/normalized-form-config';
import type { ElementConfig } from '@/schemas/field-config';
import { buildDependencyIndex, createDefaultValidationRegistry } from '@/schemas/validation';
import { createFormStore } from '@/store/create-form-store';

vi.mock('@/schemas/validation/dependencies', async (importOriginal) => {
	const original = await importOriginal<typeof import('@/schemas/validation/dependencies')>();
	return { ...original, buildDependencyIndex: vi.fn(original.buildDependencyIndex) };
});

const element = (config: Record<string, unknown>, containerKind?: 'array' | 'object') =>
	markNormalizedElementConfig(config as unknown as ElementConfig, containerKind);

const createLinesStore = () =>
	createFormStore({
		registry: createDefaultValidationRegistry(),
		elements: [
			element({ $type: 'input', name: 'note' }),
			element(
				{
					$type: 'arrayElements',
					name: 'lines',
					elements: [
						{ $type: 'input', name: 'type' },
						{
							$type: 'input',
							name: 'vat',
							constraints: [{ field: 'type', action: 'require', operator: 'equals', value: 'company' }],
						},
					],
				},
				'array',
			),
		],
		defaultValues: {
			note: '',
			lines: [
				{ type: 'person', vat: '' },
				{ type: 'person', vat: '' },
			],
		},
	});

const settle = () => new Promise<void>((resolve) => setTimeout(resolve, 5));

describe('the dependency index of a form store', () => {
	beforeEach(() => {
		vi.mocked(buildDependencyIndex).mockClear();
	});

	test('is built once and not rebuilt while the user types', async () => {
		const store = createLinesStore();
		store.setValue('note', 'a');
		const builds = vi.mocked(buildDependencyIndex).mock.calls.length;
		expect(builds).toBe(1);
		for (const text of ['ab', 'abc', 'abcd']) store.setValue('note', text);
		store.setValue('lines.0.type', 'company');
		store.blur('lines.0.vat');
		store.fieldArray('lines').swap(0, 1);
		store.fieldArray('lines').update(0, { type: 'person', vat: '' });
		store.setValue('lines', [{ type: 'a' }, { type: 'b' }]);
		await settle();
		expect(buildDependencyIndex).toHaveBeenCalledTimes(builds);
	});

	test('is rebuilt when an array gains or loses a row, so new rows get their dependents', async () => {
		const store = createLinesStore();
		store.setValue('note', 'a');
		expect(buildDependencyIndex).toHaveBeenCalledTimes(1);

		store.fieldArray('lines').append({ type: 'person', vat: '' });
		expect(buildDependencyIndex).toHaveBeenCalledTimes(2);
		store.blur('lines.2.vat');
		store.setValue('lines.2.type', 'company');
		await vi.waitFor(() => expect(store.getSnapshot().errors['lines.2.vat']).toBeDefined());
		expect(buildDependencyIndex).toHaveBeenCalledTimes(2);

		store.fieldArray('lines').remove(2);
		expect(buildDependencyIndex).toHaveBeenCalledTimes(3);
		store.reset({ note: '', lines: [] });
		store.setValue('note', 'b');
		expect(buildDependencyIndex).toHaveBeenCalledTimes(4);
	});

	test('keeps dependents correct across a rebuild', async () => {
		const store = createLinesStore();
		store.blur('lines.1.vat');
		store.fieldArray('lines').prepend({ type: 'person', vat: '' });
		store.setValue('lines.2.type', 'company');
		await vi.waitFor(() => expect(store.getSnapshot().errors['lines.2.vat']).toBeDefined());
		expect(store.getSnapshot().errors['lines.0.vat']).toBeUndefined();
	});
});

import { describe, expect, test, vi } from 'vitest';
import { markNormalizedElementConfig } from '@/lib/normalized-form-config';
import type { ElementConfig } from '@/schemas/field-config';
import { createDefaultValidationRegistry } from '@/schemas/validation';
import { createFormStore } from '@/store/create-form-store';
import type { FormStore, FormStoreOptions } from '@/store/types';

const registry = createDefaultValidationRegistry();
const element = (config: Record<string, unknown>, containerKind?: 'array' | 'object') =>
	markNormalizedElementConfig(config as unknown as ElementConfig, containerKind);

const wizard = (overrides: Partial<FormStoreOptions> = {}): FormStore =>
	createFormStore({
		registry,
		elements: [
			element({
				$type: 'input',
				name: 'password',
				rules: [{ type: 'required', message: 'Password is required' }],
			}),
			element({
				$type: 'input',
				name: 'confirmPassword',
				rules: [
					{
						type: 'relate',
						fields: ['password'],
						assert: 'allEqual',
						includeSelf: true,
						message: 'Passwords differ',
					},
				],
			}),
		],
		defaultValues: { password: '', confirmPassword: 'secret' },
		...overrides,
	});

const addressForm = (): FormStore =>
	createFormStore({
		registry,
		elements: [
			element(
				{
					$type: 'fieldset',
					name: 'address',
					elements: [
						{ $type: 'input', name: 'street' },
						{ $type: 'input', name: 'country' },
					],
				},
				'object',
			),
			element({
				$type: 'input',
				name: 'vat',
				constraints: [{ field: 'address.country', action: 'require', operator: 'equals', value: 'IT' }],
			}),
		],
		defaultValues: { address: { street: '1 Main', country: 'FR' }, vat: '' },
	});

test('catches a write to a parent of the watched path', async () => {
	const store = addressForm();
	store.blur('vat');
	store.setValue('address', { street: '1 Main', country: 'IT' });
	await vi.waitFor(() => expect(store.getSnapshot().errors.vat).toBeDefined());

	store.setValue('address', { street: '1 Main', country: 'FR' });
	await vi.waitFor(() => expect(store.getSnapshot().errors.vat).toBeUndefined());
});

const makeTagsStore = () => createFormStore({ registry, elements: [], defaultValues: { tags: ['a', 'b'] } });

const settle = () => new Promise<void>((resolve) => setTimeout(resolve, 5));

describe('createFormStore', () => {
	describe('a failed check of one step', () => {
		test('marks nothing submitted and keeps later steps quiet until they are touched', async () => {
			const store = wizard();
			expect(await store.validate(['password'])).toBe(false);
			expect(Object.keys(store.getSnapshot()).toSorted()).toEqual([
				'checkFailed',
				'dirty',
				'errors',
				'isValidating',
				'rowIds',
				'touched',
				'values',
			]);

			store.setValue('password', 'other');
			await vi.waitFor(() => expect(store.getSnapshot().errors.password).toBeUndefined());
			await settle();
			expect(store.getSnapshot().errors.confirmPassword).toBeUndefined();

			store.blur('confirmPassword');
			store.setValue('password', 'another');
			await vi.waitFor(() =>
				expect(store.getSnapshot().errors.confirmPassword?.message).toBe('Passwords differ'),
			);
		});

		test('a failed check of the whole form surfaces every dependent', async () => {
			const store = wizard();
			expect(await store.validate()).toBe(false);
			store.setValue('password', 'other');
			await vi.waitFor(() =>
				expect(store.getSnapshot().errors.confirmPassword?.message).toBe('Passwords differ'),
			);
		});

		test('without a failed check an untouched dependent stays quiet', async () => {
			const store = wizard();
			store.setValue('password', 'other');
			await settle();
			expect(store.getSnapshot().errors).toEqual({});
		});
	});

	describe('dependent re-validation', () => {
		test('catches a write to the watched path itself', async () => {
			const store = addressForm();
			store.blur('vat');
			store.setValue('address.country', 'IT');
			await vi.waitFor(() => expect(store.getSnapshot().errors.vat).toBeDefined());
		});

		test('ignores a write that leaves the watched value as it was', async () => {
			const store = addressForm();
			store.blur('vat');
			store.setValue('address', { street: '2 Side', country: 'FR' });
			await settle();
			expect(store.getSnapshot().errors).toEqual({});
		});

		test('follows rows that moved', async () => {
			const store = createFormStore({
				registry,
				elements: [
					element(
						{
							$type: 'arrayElements',
							name: 'lines',
							elements: [
								{ $type: 'input', name: 'type' },
								{
									$type: 'input',
									name: 'vat',
									constraints: [
										{ field: 'type', action: 'require', operator: 'equals', value: 'company' },
									],
								},
							],
						},
						'array',
					),
				],
				defaultValues: {
					lines: [
						{ type: 'person', vat: '' },
						{ type: 'person', vat: '' },
					],
				},
			});
			store.blur('lines.0.vat');
			store.fieldArray('lines').swap(0, 1);
			store.setValue('lines.0.type', 'company');
			await settle();
			expect(store.getSnapshot().errors).toEqual({});
			store.setValue('lines.1.type', 'company');
			await vi.waitFor(() => expect(store.getSnapshot().errors['lines.1.vat']).toBeDefined());
			expect(store.getSnapshot().errors['lines.0.vat']).toBeUndefined();
		});
	});

	describe('row ids', () => {
		test('adopts ids for an array nested in a row', () => {
			const store = createFormStore({
				registry,
				elements: [],
				defaultValues: { contacts: [{ phones: ['1', '2'] }] },
			});
			expect(store.getSnapshot().rowIds['contacts.0.phones']).toHaveLength(2);
			store.adoptRowIds('contacts.0.phones', ['p1', 'p2']);
			expect(store.fieldArray('contacts.0.phones').fields).toEqual([{ id: 'p1' }, { id: 'p2' }]);
			store.fieldArray('contacts').prepend({ phones: [] });
			expect(store.getSnapshot().rowIds['contacts.1.phones']).toEqual(['p1', 'p2']);
		});

		test('mints ids deterministically, so a server render and its hydration agree', () => {
			expect(makeTagsStore().getSnapshot().rowIds).toEqual(makeTagsStore().getSnapshot().rowIds);
		});
	});

	describe('representation', () => {
		test('holds null-prototype maps and hands out plain records', () => {
			const store = createFormStore({
				registry,
				elements: [],
				defaultValues: { address: { street: '1 Main' }, tags: [{ label: 'a' }] },
			});
			const { values } = store.getSnapshot();
			expect(Object.getPrototypeOf(values)).toBe(Object.prototype);
			expect(Object.getPrototypeOf(values.address)).toBe(Object.prototype);
			expect(Object.getPrototypeOf((values.tags as unknown[])[0])).toBe(Object.prototype);
			expect(Object.getPrototypeOf(store.getSnapshot().errors)).toBe(Object.prototype);
			expect(Object.getPrototypeOf(store.getSnapshot().rowIds)).toBe(Object.prototype);
		});

		test('rejects a path that would reach a prototype', () => {
			const store = createFormStore({ registry, elements: [] });
			expect(() => store.setValue('__proto__.polluted', true)).toThrow(/Rejected path segment/);
			expect(({} as Record<string, unknown>).polluted).toBeUndefined();
		});
	});
});

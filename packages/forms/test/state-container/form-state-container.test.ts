import { describe, expect, test, vi } from 'vitest';
import { defaultModes, watchValidation } from '../../../../test-utils/form-state-container-conformance';
import * as z from 'zod/mini';
import { markNormalizedElementConfig } from '@/lib/normalized-form-config';
import type { ElementConfig } from '@/schemas/field-config';
import { createDefaultValidationRegistry } from '@/schemas/validation';
import { createFormStateContainer } from '@/state-container/create-form-state-container';
import type { FormStateContainer, FormStateContainerOptions } from '@/state-container/types';

const registry = createDefaultValidationRegistry();
const element = (config: Record<string, unknown>, containerKind?: 'array' | 'object') =>
	markNormalizedElementConfig(config as unknown as ElementConfig, containerKind);

const wizard = (overrides: Partial<FormStateContainerOptions> = {}): FormStateContainer =>
	createFormStateContainer({
		...defaultModes,
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
		defaults: { password: '', confirmPassword: 'secret' },
		...overrides,
	});

const addressForm = (country = 'FR'): FormStateContainer =>
	createFormStateContainer({
		...defaultModes,
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
		defaults: { address: { street: '1 Main', country }, vat: '' },
	});

test('catches a write to a parent of the watched path', async () => {
	const store = addressForm();
	store.blur('vat');
	store.setValue('address', { street: '1 Main', country: 'IT' });
	await vi.waitFor(() => expect(store.getSnapshot().errors.vat).toBeDefined());

	store.setValue('address', { street: '1 Main', country: 'FR' });
	await vi.waitFor(() => expect(store.getSnapshot().errors.vat).toBeUndefined());
});

const makeTagsStore = () =>
	createFormStateContainer({ ...defaultModes, registry, elements: [], defaults: { tags: ['a', 'b'] } });

const settle = () => new Promise<void>((resolve) => setTimeout(resolve, 5));

describe('createFormStateContainer', () => {
	describe('a failed check of one step', () => {
		test('marks nothing submitted and keeps later steps quiet until they are touched', async () => {
			const store = wizard();
			expect(await store.validate(['password'])).toBe(false);
			expect(store.getSnapshot()).not.toHaveProperty('isSubmitted');

			store.setValue('password', 'other');
			expect(store.getSnapshot().isValidating).toBe(true);
			await vi.waitFor(() => expect(store.getSnapshot().isValidating).toBe(false));
			expect(store.getSnapshot().errors.password).toBeUndefined();
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
			const watch = watchValidation(store);
			store.setValue('password', 'other');
			await settle();
			expect(watch.started).toBe(false);
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
			const store = addressForm('IT');
			store.blur('vat');
			const watch = watchValidation(store);
			store.setValue('address', { street: '2 Side', country: 'IT' });
			await settle();
			expect(watch.started).toBe(false);
			expect(store.getSnapshot().errors).toEqual({});
			store.setValue('address', { street: '2 Side', country: 'FR' });
			store.setValue('address', { street: '2 Side', country: 'IT' });
			await vi.waitFor(() => expect(store.getSnapshot().errors.vat).toBeDefined());
		});

		test('follows rows that moved', async () => {
			const store = createFormStateContainer({
				...defaultModes,
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
				defaults: {
					lines: [
						{ type: 'person', vat: '' },
						{ type: 'person', vat: '' },
					],
				},
			});
			store.blur('lines.0.vat');
			store.fieldArray('lines').swap(0, 1);
			const watch = watchValidation(store);
			store.setValue('lines.0.type', 'company');
			await settle();
			expect(watch.started).toBe(false);
			expect(store.getSnapshot().errors).toEqual({});
			store.setValue('lines.1.type', 'company');
			await vi.waitFor(() => expect(store.getSnapshot().errors['lines.1.vat']).toBeDefined());
			expect(store.getSnapshot().errors['lines.0.vat']).toBeUndefined();
		});
	});

	describe('row ids', () => {
		test('adopts ids for an array nested in a row, and they move with the row', () => {
			const store = createFormStateContainer({
				...defaultModes,
				registry,
				elements: [],
				defaults: { contacts: [{ phones: ['1', '2'] }] },
				rowIds: { contacts: ['c1'], 'contacts.0.phones': ['p1', 'p2'] },
			});
			expect(store.getSnapshot().rowIds).toEqual({ contacts: ['c1'], 'contacts.0.phones': ['p1', 'p2'] });
			store.fieldArray('contacts').prepend({ phones: [] });
			expect(store.getSnapshot().rowIds['contacts.1.phones']).toEqual(['p1', 'p2']);
		});

		test('mints ids deterministically, so a server render and its hydration agree', () => {
			expect(makeTagsStore().getSnapshot().rowIds).toEqual(makeTagsStore().getSnapshot().rowIds);
		});
	});

	describe('representation', () => {
		test('hands out plain records', () => {
			const store = createFormStateContainer({
				...defaultModes,
				registry,
				elements: [],
				defaults: { address: { street: '1 Main' }, tags: [{ label: 'a' }] },
			});
			const { values } = store.getSnapshot();
			expect(Object.getPrototypeOf(values)).toBe(Object.prototype);
			expect(Object.getPrototypeOf(values.address)).toBe(Object.prototype);
			expect(Object.getPrototypeOf((values.tags as unknown[])[0])).toBe(Object.prototype);
			expect(Object.getPrototypeOf(store.getSnapshot().errors)).toBe(Object.prototype);
			expect(Object.getPrototypeOf(store.getSnapshot().rowIds)).toBe(Object.prototype);
		});

		test('rejects a path that would reach a prototype', () => {
			const store = createFormStateContainer({ ...defaultModes, registry, elements: [] });
			expect(() => store.setValue('__proto__.polluted', true)).toThrow(/reserved segment/);
			expect(({} as Record<string, unknown>).polluted).toBeUndefined();
		});
	});

	describe('writes that reshape the tree', () => {
		test('a nested write below a row appended meanwhile gives it an id', () => {
			const store = createFormStateContainer({
				...defaultModes,
				registry,
				elements: [],
				defaults: { contacts: [{ email: 'a' }] },
			});
			store.setValue('contacts', [{ email: 'a' }, { email: 'b' }]);
			expect(store.getSnapshot().rowIds.contacts).toHaveLength(2);
			expect(() => store.setValue('contacts.3.email', 'x')).toThrow(/names row '3'/);
		});

		test('replacing a branch swaps keys whose values are undefined', () => {
			const store = createFormStateContainer({
				...defaultModes,
				registry,
				elements: [],
				defaults: { profile: { old: undefined } },
			});
			const listener = vi.fn();
			store.subscribe(listener);
			store.setValue('profile', { replacement: undefined });
			expect(listener).toHaveBeenCalledTimes(1);
			expect(Object.keys(store.getSnapshot().values.profile as object)).toEqual(['replacement']);
		});

		test('an empty array written where the defaults have nothing is dirty', () => {
			const store = createFormStateContainer({ ...defaultModes, registry, elements: [] });
			store.setValue('tags', []);
			expect(store.getSnapshot().dirty).toEqual({ tags: true });
			expect(store.getFieldState('tags').isDirty).toBe(true);
		});

		test('dirty reaches the fields below a container the defaults lack', () => {
			const store = createFormStateContainer({ ...defaultModes, registry, elements: [] });
			store.setValue('address.street', 'Main');
			expect(store.getSnapshot().dirty).toEqual({ 'address.street': true });
		});
	});

	describe('field arrays and validation', () => {
		const contactsForm = () =>
			createFormStateContainer({
				...defaultModes,
				registry,
				elements: [
					element(
						{
							$type: 'arrayElements',
							name: 'contacts',
							elements: [
								{
									$type: 'input',
									name: 'email',
									rules: [{ type: 'required', message: 'Email is required' }],
								},
								{ $type: 'input', name: 'label' },
							],
						},
						'array',
					),
				],
				defaults: { contacts: [{ email: '' }, { email: '' }] },
			});

		test('a failed check follows its row when rows move', async () => {
			const store = contactsForm();
			expect(await store.validate(['contacts.1.email'])).toBe(false);
			store.fieldArray('contacts').remove(0);
			store.setValue('contacts.0.email', 'a@example.com');
			await vi.waitFor(() => expect(store.getSnapshot().errors['contacts.0.email']).toBeUndefined());
		});

		test('an array operation re-validates the array after a failed check', async () => {
			const store = createFormStateContainer({
				...defaultModes,
				registry,
				elements: [
					element(
						{
							$type: 'arrayElements',
							name: 'tags',
							rules: [{ type: 'minItems', value: 1, message: 'Add a tag' }],
							elements: [{ $type: 'input', name: 'value' }],
						},
						'array',
					),
				],
				defaults: { tags: [] },
			});
			expect(await store.validate()).toBe(false);
			expect(store.getSnapshot().errors.tags?.message).toBe('Add a tag');
			store.fieldArray('tags').append('a');
			await vi.waitFor(() => expect(store.getSnapshot().errors.tags).toBeUndefined());
		});
	});

	describe('overlapping validations', () => {
		const gatedPasswords = () => {
			const waiting: Array<() => void> = [];
			let holding = true;
			const gatedRegistry = createDefaultValidationRegistry([
				{
					$type: 'matchesSlow',
					schema: z.object({ type: z.literal('matchesSlow') }),
					metadata: { name: 'Matches slowly' },
					category: 'cross-field',
					dependsOn: () => ['password'],
					handler: (_rule: unknown, context: { resolve: (reference: string) => unknown }) =>
						z.any().check(
							z.refine((value: unknown) => {
								const matches = value === context.resolve('password');
								return holding
									? new Promise<boolean>((resolve) => waiting.push(() => resolve(matches)))
									: Promise.resolve(matches);
							}, 'Passwords differ'),
						),
				} as never,
			]);
			return {
				registry: gatedRegistry,
				pending: () => waiting.length,
				release: () => waiting.splice(0).forEach((resolve) => resolve()),
				stopHolding: () => {
					holding = false;
				},
			};
		};

		test('an older run cannot overwrite the result of a newer one for a cross-field rule', async () => {
			const gate = gatedPasswords();
			const store = createFormStateContainer({
				...defaultModes,
				registry: gate.registry,
				elements: [
					element({ $type: 'input', name: 'password' }),
					element({ $type: 'input', name: 'confirm', rules: [{ type: 'matchesSlow' }] }),
				],
				defaults: { password: 'old', confirm: 'new' },
			});
			store.blur('confirm');
			const submit = store.validate();
			await vi.waitFor(() => expect(gate.pending()).toBe(1));
			gate.stopHolding();
			store.setValue('password', 'new');
			await vi.waitFor(() => expect(store.getSnapshot().errors.confirm).toBeUndefined());
			gate.release();
			expect(await submit).toBe(true);
			expect(store.getSnapshot().errors).toEqual({});
		});

		test('a row operation during validate makes it resolve with the validity of the current state', async () => {
			const gate = gatedPasswords();
			const store = createFormStateContainer({
				...defaultModes,
				registry: gate.registry,
				elements: [
					element({ $type: 'input', name: 'password' }),
					element({ $type: 'input', name: 'confirm', rules: [{ type: 'matchesSlow' }] }),
					element(
						{
							$type: 'arrayElements',
							name: 'tags',
							elements: [
								{ $type: 'input', name: 'v' },
								{ $type: 'input', name: 'w' },
							],
						},
						'array',
					),
				],
				defaults: { password: 'a', confirm: 'b', tags: [] },
			});
			const submit = store.validate();
			await vi.waitFor(() => expect(gate.pending()).toBe(1));
			store.fieldArray('tags').append({ v: 'x' });
			gate.stopHolding();
			gate.release();
			expect(await submit).toBe(false);
			expect(store.getSnapshot().errors.confirm).toBeDefined();
			expect(store.getSnapshot().isValidating).toBe(false);
		});
	});

	describe('validate while the form is edited', () => {
		const requiredForm = () =>
			createFormStateContainer({
				...defaultModes,
				registry,
				elements: [
					element({
						$type: 'input',
						name: 'name',
						rules: [{ type: 'required', message: 'Name is required' }],
					}),
					element(
						{
							$type: 'arrayElements',
							name: 'contacts',
							elements: [
								{
									$type: 'input',
									name: 'email',
									rules: [{ type: 'required', message: 'Email is required' }],
								},
								{ $type: 'input', name: 'label' },
							],
						},
						'array',
					),
				],
				defaults: { name: 'Ada', contacts: [{}] },
			});

		test('a pass is not trusted when the value it passed changed meanwhile', async () => {
			const store = requiredForm();
			const run = store.validate(['name']);
			store.setValue('name', '');
			expect(await run).toBe(false);
			expect(store.getSnapshot().errors.name?.message).toBe('Name is required');
		});

		test('a pass is not trusted when a later on-change validation took over its path', async () => {
			const store = createFormStateContainer({
				...defaultModes,
				registry,
				validationMode: 'onChange',
				elements: [
					element({
						$type: 'input',
						name: 'name',
						rules: [{ type: 'required', message: 'Name is required' }],
					}),
				],
				defaults: { name: 'Ada' },
			});
			const run = store.validate(['name']);
			store.setValue('name', '');
			expect(await run).toBe(false);
			expect(store.getSnapshot().errors.name?.message).toBe('Name is required');
		});

		test('a result below a row removed meanwhile is dropped even when its parent object never existed', async () => {
			const store = createFormStateContainer({
				...defaultModes,
				registry,
				validationMode: 'onBlur',
				elements: [
					element(
						{
							$type: 'arrayElements',
							name: 'contacts',
							elements: [
								{
									$type: 'fieldset',
									name: 'address',
									elements: [
										{
											$type: 'input',
											name: 'street',
											rules: [{ type: 'required', message: 'Street is required' }],
										},
									],
								},
								{ $type: 'input', name: 'label' },
							],
						},
						'array',
					),
				],
				defaults: { contacts: [{ label: 'a' }] },
			});
			store.blur('contacts.0.address.street');
			store.setValue('contacts', []);
			await vi.waitFor(() => expect(store.getSnapshot().isValidating).toBe(false));
			expect(store.getSnapshot().errors).toEqual({});
		});

		test('a result below an object replaced by null meanwhile is dropped', async () => {
			const store = createFormStateContainer({
				...defaultModes,
				registry,
				validationMode: 'onBlur',
				elements: [
					element(
						{
							$type: 'fieldset',
							name: 'address',
							elements: [
								{
									$type: 'input',
									name: 'street',
									rules: [{ type: 'required', message: 'Street is required' }],
								},
							],
						},
						'object',
					),
				],
				defaults: { address: {} },
			});
			store.blur('address.street');
			store.setValue('address', null);
			await vi.waitFor(() => expect(store.getSnapshot().isValidating).toBe(false));
			expect(store.getSnapshot().errors).toEqual({});
		});

		test('required fields below a missing object are reported', async () => {
			const store = createFormStateContainer({
				...defaultModes,
				registry,
				elements: [
					element(
						{
							$type: 'fieldset',
							name: 'address',
							elements: [
								{
									$type: 'input',
									name: 'street',
									rules: [{ type: 'required', message: 'Street is required' }],
								},
							],
						},
						'object',
					),
				],
			});
			expect(await store.validate()).toBe(false);
			expect(store.getSnapshot().errors['address.street']?.message).toBe('Street is required');
		});

		test('a shorter array is seen as changed even when the removed rows were undefined', async () => {
			const store = createFormStateContainer({
				...defaultModes,
				registry,
				elements: [
					element(
						{
							$type: 'arrayElements',
							name: 'tags',
							rules: [{ type: 'minItems', value: 1, message: 'Add a tag' }],
							elements: [{ $type: 'input', name: 'value' }],
						},
						'array',
					),
				],
				defaults: { tags: [undefined] },
			});
			const run = store.validate(['tags']);
			store.setValue('tags', []);
			expect(await run).toBe(false);
			expect(store.getSnapshot().errors.tags?.message).toBe('Add a tag');
		});

		test('a result for a row removed meanwhile is dropped, and the check resolves false: its rows are gone', async () => {
			const store = requiredForm();
			const run = store.validate(['contacts.0.email']);
			store.setValue('contacts', []);
			expect(await run).toBe(false);
			expect(store.getSnapshot().errors).toEqual({});
		});
	});

	describe('late results and rows that move', () => {
		const manualRule = () => {
			const calls: Array<{ resolve: (valid: boolean) => void }> = [];
			let manual = true;
			const readsOf = (rule: { reads?: string | string[] }): string[] => [rule.reads ?? []].flat();
			const manualRegistry = createDefaultValidationRegistry([
				{
					$type: 'manual',
					schema: z.object({ type: z.literal('manual') }),
					metadata: { name: 'Manual' },
					category: 'cross-field',
					dependsOn: readsOf,
					handler: (
						rule: { reads?: string | string[] },
						context: { resolve: (reference: string) => unknown },
					) =>
						z.any().check(
							z.refine((value: unknown) => {
								const reads = readsOf(rule);
								const valid =
									reads.length === 0 || reads.some((read) => value === context.resolve(read));
								return manual
									? new Promise<boolean>((resolve) => calls.push({ resolve }))
									: Promise.resolve(valid);
							}, 'Not valid'),
						),
				} as never,
			]);
			return { registry: manualRegistry, calls, auto: () => (manual = false) };
		};

		test('a rule that reads an absolute indexed path is invalidated when rows move under it', async () => {
			const rule = manualRule();
			const store = createFormStateContainer({
				...defaultModes,
				registry: rule.registry,
				elements: [
					element({
						$type: 'input',
						name: 'confirm',
						rules: [{ type: 'manual', reads: 'contacts.0.email' }],
					}),
					element(
						{
							$type: 'arrayElements',
							name: 'contacts',
							elements: [
								{ $type: 'input', name: 'email' },
								{ $type: 'input', name: 'label' },
							],
						},
						'array',
					),
				],
				defaults: { confirm: 'a', contacts: [{ email: 'a' }, { email: 'b' }] },
			});
			const run = store.validate(['confirm']);
			await vi.waitFor(() => expect(rule.calls).toHaveLength(1));
			store.fieldArray('contacts').swap(0, 1);
			rule.auto();
			rule.calls[0].resolve(true);
			expect(await run).toBe(false);
			expect(store.getSnapshot().errors.confirm).toBeDefined();
		});

		test('an absolute reference is not mistaken for a sibling when it starts in the same row', async () => {
			const rule = manualRule();
			const store = createFormStateContainer({
				...defaultModes,
				registry: rule.registry,
				validationMode: 'onChange',
				elements: [
					element(
						{
							$type: 'arrayElements',
							name: 'contacts',
							elements: [
								{ $type: 'input', name: 'email' },
								{
									$type: 'input',
									name: 'confirm',
									rules: [{ type: 'manual', reads: 'contacts.0.email' }],
								},
							],
						},
						'array',
					),
				],
				defaults: { contacts: [{ email: 'a', confirm: 'a' }, { email: 'b' }] },
			});
			store.setValue('contacts.0.confirm', 'b');
			await vi.waitFor(() => expect(rule.calls).toHaveLength(1));
			store.fieldArray('contacts').swap(0, 1);
			rule.auto();
			rule.calls[0].resolve(false);
			for (const call of rule.calls.slice(1)) call.resolve(true);
			await vi.waitFor(() => expect(store.getSnapshot().isValidating).toBe(false));
			expect(store.getSnapshot().errors['contacts.1.confirm']).toBeUndefined();
		});

		test('a sibling read is still watched when an absolute reference names the same field', async () => {
			const rule = manualRule();
			const store = createFormStateContainer({
				...defaultModes,
				registry: rule.registry,
				validationMode: 'onChange',
				elements: [
					element(
						{
							$type: 'arrayElements',
							name: 'contacts',
							elements: [
								{ $type: 'input', name: 'email' },
								{
									$type: 'input',
									name: 'confirm',
									rules: [{ type: 'manual', reads: ['email', 'contacts.0.email'] }],
								},
							],
						},
						'array',
					),
				],
				defaults: { contacts: [{ email: 'a', confirm: 'a' }, { email: 'a' }] },
			});
			store.setValue('contacts.0.confirm', 'b');
			await vi.waitFor(() => expect(rule.calls).toHaveLength(1));
			store.fieldArray('contacts').swap(0, 1);
			store.setValue('contacts.1.email', 'b');
			rule.auto();
			rule.calls[0].resolve(false);
			for (const call of rule.calls.slice(1)) call.resolve(true);
			await vi.waitFor(() => expect(store.getSnapshot().isValidating).toBe(false));
			expect(store.getSnapshot().errors['contacts.1.confirm']).toBeUndefined();
		});

		test('the latest requester still wins for a row after rows move', async () => {
			const rule = manualRule();
			const store = createFormStateContainer({
				...defaultModes,
				registry: rule.registry,
				validationMode: 'onBlur',
				elements: [
					element(
						{
							$type: 'arrayElements',
							name: 'contacts',
							elements: [
								{ $type: 'input', name: 'email', rules: [{ type: 'manual' }] },
								{ $type: 'input', name: 'label' },
							],
						},
						'array',
					),
				],
				defaults: { contacts: [{ email: 'x' }, { email: 'y' }] },
			});
			store.blur('contacts.0.email');
			store.blur('contacts.0.email');
			await vi.waitFor(() => expect(rule.calls).toHaveLength(2));
			store.fieldArray('contacts').swap(0, 1);
			rule.calls[1].resolve(true);
			await vi.waitFor(() => expect(store.getSnapshot().isValidating).toBe(true));
			rule.calls[0].resolve(false);
			await vi.waitFor(() => expect(store.getSnapshot().isValidating).toBe(false));
			expect(store.getSnapshot().errors).toEqual({});
		});

		test('a container and a row inside it fail together, and each clears on its own', async () => {
			const store = createFormStateContainer({
				...defaultModes,
				registry,
				validationMode: 'onSubmit',
				reValidateMode: 'onSubmit',
				elements: [
					element(
						{
							$type: 'arrayElements',
							name: 'contacts',
							rules: [{ type: 'minItems', value: 2, message: 'Add two contacts' }],
							elements: [
								{
									$type: 'input',
									name: 'email',
									rules: [{ type: 'required', message: 'Email is required' }],
								},
								{ $type: 'input', name: 'label' },
							],
						},
						'array',
					),
				],
				defaults: { contacts: [] },
			});
			expect(await store.validate()).toBe(false);
			expect(Object.keys(store.getSnapshot().errors)).toEqual(['contacts']);
			store.fieldArray('contacts').append({ label: 'x' });
			expect(await store.validate()).toBe(false);
			expect(Object.keys(store.getSnapshot().errors).toSorted()).toEqual(['contacts', 'contacts.0.email']);
			store.fieldArray('contacts').append({ email: 'b@example.com' });
			expect(await store.validate()).toBe(false);
			expect(Object.keys(store.getSnapshot().errors)).toEqual(['contacts.0.email']);
			store.setValue('contacts.0.email', 'a@example.com');
			expect(await store.validate()).toBe(true);
			expect(store.getSnapshot().errors).toEqual({});
		});
	});

	describe('paths named like object methods', () => {
		test('are ordinary paths: nothing is inherited from the prototype', () => {
			const store = createFormStateContainer({
				...defaultModes,
				registry,
				elements: [],
				defaults: { tags: ['a'] },
			});
			store.setErrors('server', { toString: { message: 'no' } });
			store.blur('hasOwnProperty');
			expect(store.getFieldState('toString').error?.message).toBe('no');
			expect(store.getFieldState('valueOf')).toEqual({
				error: undefined,
				warning: undefined,
				invalid: false,
				isTouched: false,
				isDirty: false,
				isValidating: false,
			});
			expect(store.getFieldState('hasOwnProperty').isTouched).toBe(true);
			expect(Object.hasOwn(store.getSnapshot().rowIds, 'valueOf')).toBe(false);
			expect(store.getSnapshot().rowIds.tags).toHaveLength(1);
		});
	});

	describe('silent checks', () => {
		test('overlapping checkValidity calls of a debounced rule each answer for their own value', async () => {
			vi.useFakeTimers();
			const fetchSpy = vi
				.spyOn(globalThis, 'fetch')
				.mockImplementation(async () => new Response(JSON.stringify({ valid: true }), { status: 200 }));
			try {
				const store = createFormStateContainer({
					...defaultModes,
					registry,
					elements: [
						element({
							$type: 'input',
							name: 'email',
							rules: [{ type: 'async', url: '/api/check', debounce: 300, disableCache: true }],
						}),
					],
					defaults: { email: 'a@example.com' },
				});
				const first = store.checkValidity();
				store.setValue('email', 'b@example.com');
				const second = store.checkValidity();
				await vi.advanceTimersByTimeAsync(400);

				expect(await Promise.all([first, second])).toEqual([true, true]);
				expect(fetchSpy).toHaveBeenCalledTimes(2);
			} finally {
				fetchSpy.mockRestore();
				vi.useRealTimers();
			}
		});
	});
});

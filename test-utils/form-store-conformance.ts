import { describe, expect, test, vi } from 'vitest';
import * as z from 'zod/mini';
import { markNormalizedElementConfig } from '../packages/forms/src/lib/normalized-form-config';
import type { ElementConfig } from '../packages/forms/src/schemas/field-config';
import { createDefaultValidationRegistry } from '../packages/forms/src/schemas/validation/validation-registry';
import type { FormStore, FormStoreFactory, FormStoreOptions } from '../packages/forms/src/store/types';

/**
 * One rule of the internal form store contract, with the check that proves it.
 *
 * @remarks
 * `run` throws when the store breaks the rule. {@link formStoreCases} lists them so a test can point a
 * deliberately broken store at the rule it breaks; {@link formStoreConformance} registers them as tests.
 */
export interface FormStoreCase {
	readonly rule: string;
	readonly name: string;
	readonly run: (createStore: FormStoreFactory) => void | Promise<void>;
}

/**
 * An async validation rule that passes at once, except for the values a test holds, which it settles by
 * hand so a result can arrive after a reset or a row move.
 */
function createGate() {
	const waiting = new Map<string, Array<(valid: boolean) => void>>();
	const held = new Set<string>();
	return {
		hold: (...values: string[]): void => values.forEach((value) => held.add(value)),
		check: (value: unknown): Promise<boolean> =>
			!held.has(String(value))
				? Promise.resolve(true)
				: new Promise((resolve) => {
						const key = String(value);
						waiting.set(key, [...(waiting.get(key) ?? []), resolve]);
					}),
		pending: (value: string): number => waiting.get(value)?.length ?? 0,
		settle(value: string, valid: boolean): void {
			for (const resolve of waiting.get(value) ?? []) resolve(valid);
			waiting.delete(value);
		},
	};
}

const element = (config: Record<string, unknown>, containerKind?: 'array' | 'object') =>
	markNormalizedElementConfig(config as unknown as ElementConfig, containerKind);

interface Fixture {
	readonly options: FormStoreOptions;
	readonly gate: ReturnType<typeof createGate>;
}

function fixture(overrides: Partial<FormStoreOptions> = {}): Fixture {
	const gate = createGate();
	const registry = createDefaultValidationRegistry([
		{
			$type: 'gate',
			schema: z.object({ type: z.literal('gate') }),
			metadata: { name: 'Gate' },
			category: 'generic',
			handler: () => z.any().check(z.refine((value: unknown) => gate.check(value), 'Value is taken')),
		},
	]);
	return {
		gate,
		options: {
			registry,
			elements: [
				element({ $type: 'input', name: 'name', rules: [{ type: 'required', message: 'Name is required' }] }),
				element({
					$type: 'input',
					name: 'nickname',
					rules: [{ type: 'required', message: 'Nickname is required' }],
				}),
				element({ $type: 'input', name: 'slug', rules: [{ type: 'gate' }] }),
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
				element(
					{
						$type: 'arrayElements',
						name: 'invites',
						elements: [
							{ $type: 'input', name: 'code', rules: [{ type: 'gate' }] },
							{ $type: 'input', name: 'label' },
						],
					},
					'array',
				),
			],
			defaultValues: {
				name: 'Ada',
				nickname: 'ada',
				slug: 'free',
				address: { street: '1 Main', country: 'IT' },
				contacts: [{ email: 'a@example.com' }, { email: 'b@example.com' }, { email: 'c@example.com' }],
				invites: [{ code: 'one' }, { code: 'two' }],
			},
			...overrides,
		},
	};
}

const error = (message: string) => ({ type: 'custom', message });
const settle = () => new Promise<void>((resolve) => setTimeout(resolve, 5));
const errorsOf = (store: FormStore) => store.getSnapshot().errors;
const contacts = (store: FormStore) =>
	(store.getSnapshot().values.contacts as Array<{ email: string }>).map((row) => row.email);

/** The row ids of `contacts`, in row order. */
const ids = (store: FormStore) => store.getSnapshot().rowIds.contacts ?? [];

const cases: FormStoreCase[] = [
	{
		rule: 'snapshot stability',
		name: 'returns the same snapshot until something changes, and notifies once per change',
		run(createStore) {
			const store = createStore(fixture().options);
			const first = store.getSnapshot();
			expect(store.getSnapshot()).toBe(first);
			const listener = vi.fn();
			const unsubscribe = store.subscribe(listener);
			store.setValue('name', 'Grace');
			expect(listener).toHaveBeenCalledTimes(1);
			const second = store.getSnapshot();
			expect(second).not.toBe(first);
			expect(store.getSnapshot()).toBe(second);
			store.setValue('name', 'Grace');
			expect(listener).toHaveBeenCalledTimes(1);
			expect(store.getSnapshot()).toBe(second);
			unsubscribe();
			store.setValue('name', 'Hedy');
			expect(listener).toHaveBeenCalledTimes(1);
		},
	},
	{
		rule: 'snapshot stability',
		name: 'keeps one server snapshot for hydration, whatever happens to the store',
		run(createStore) {
			const store = createStore(fixture().options);
			const server = store.getServerSnapshot();
			expect(store.getServerSnapshot()).toBe(server);
			expect(server.values.name).toBe('Ada');
			store.setValue('name', 'Grace');
			store.blur('name');
			expect(store.getServerSnapshot()).toBe(server);
			expect(server.values.name).toBe('Ada');
			expect(store.getSnapshot().values.name).toBe('Grace');
		},
	},
	{
		rule: 'immutability',
		name: 'freezes snapshots and does not alias the values it was given',
		run(createStore) {
			const defaults = { name: 'Ada', address: { street: '1 Main', country: 'IT' } };
			const store = createStore(fixture({ defaultValues: defaults }).options);
			const snapshot = store.getSnapshot();
			expect(() => {
				(snapshot.values as Record<string, unknown>).name = 'Eve';
			}).toThrow(TypeError);
			expect(() => {
				(snapshot.values.address as Record<string, unknown>).street = 'Eve';
			}).toThrow(TypeError);
			expect(() => {
				(snapshot.errors as Record<string, unknown>).name = error('x');
			}).toThrow(TypeError);
			expect(() => {
				(snapshot.touched as Record<string, unknown>).name = true;
			}).toThrow(TypeError);

			defaults.address.street = 'changed after create';
			expect((store.getSnapshot().values.address as { street: string }).street).toBe('1 Main');

			const branch = { street: '2 Side', country: 'FR' };
			store.setValue('address', branch);
			branch.street = 'changed after setValue';
			expect((store.getSnapshot().values.address as { street: string }).street).toBe('2 Side');

			const given = { name: error('Taken') };
			store.setErrors('server', given);
			given.name.message = 'changed after setErrors';
			expect(errorsOf(store).name?.message).toBe('Taken');
			expect(Object.getPrototypeOf(store.getSnapshot().values)).toBe(Object.prototype);
		},
	},
	{
		rule: 'branch reference preservation',
		name: 'keeps the reference of every branch a command did not change',
		run(createStore) {
			const store = createStore(fixture().options);
			const before = store.getSnapshot();
			store.setValue('name', 'Grace');
			const after = store.getSnapshot();
			expect(after.values.address).toBe(before.values.address);
			expect(after.values.contacts).toBe(before.values.contacts);
			expect(after.errors).toBe(before.errors);
			expect(after.touched).toBe(before.touched);
			expect(after.rowIds).toBe(before.rowIds);

			store.setValue('contacts.1.email', 'new@example.com');
			const rows = store.getSnapshot().values.contacts as unknown[];
			const earlier = after.values.contacts as unknown[];
			expect(rows).not.toBe(earlier);
			expect(rows[0]).toBe(earlier[0]);
			expect(rows[1]).not.toBe(earlier[1]);
			expect(rows[2]).toBe(earlier[2]);

			store.blur('name');
			expect(store.getSnapshot().values).toBe(store.getSnapshot().values);
			expect(store.getSnapshot().values.contacts).toBe(rows);
		},
	},
	{
		rule: 'opaque values',
		name: 'stores and compares opaque values, such as File arrays, by reference',
		run(createStore) {
			const store = createStore(fixture().options);
			const file = new File(['x'], 'a.txt');
			const files = [file];
			store.setValue('files', files);
			expect(store.getSnapshot().values.files).toBe(files);
			expect(store.getValue('files')).toBe(files);
			expect(Object.isFrozen(files)).toBe(false);

			const listener = vi.fn();
			store.subscribe(listener);
			store.setValue('files', files);
			expect(listener).not.toHaveBeenCalled();

			store.setValue('files', [file]);
			expect(listener).toHaveBeenCalledTimes(1);
			expect(store.getSnapshot().values.files).not.toBe(files);
			expect((store.getSnapshot().values.files as File[])[0]).toBe(file);
			expect(store.getSnapshot().dirty.files).toBe(true);

			store.setValue('profile', { avatar: [file] });
			expect((store.getSnapshot().values.profile as { avatar: File[] }).avatar[0]).toBe(file);
		},
	},
	{
		rule: 'branch replacement',
		name: 'setValue replaces the whole branch rather than merging into it',
		run(createStore) {
			const store = createStore(fixture().options);
			store.setValue('address', { street: '9 Elm' });
			expect(store.getSnapshot().values.address).toEqual({ street: '9 Elm' });
			expect(store.getValue('address.country')).toBeUndefined();
			store.setValue('contacts', [{ email: 'only@example.com' }]);
			expect(contacts(store)).toEqual(['only@example.com']);
			expect(store.getSnapshot().rowIds.contacts).toHaveLength(1);
		},
	},
	{
		rule: 'branch replacement',
		name: 'a replacement with the same content changes nothing and keeps references',
		run(createStore) {
			const store = createStore(fixture().options);
			const before = store.getSnapshot();
			const listener = vi.fn();
			store.subscribe(listener);
			store.setValue('address', { street: '1 Main', country: 'IT' });
			expect(listener).not.toHaveBeenCalled();
			expect(store.getSnapshot()).toBe(before);
			store.setValue('address', { street: '1 Main', country: 'FR' });
			const after = store.getSnapshot();
			expect(after.values.contacts).toBe(before.values.contacts);
		},
	},
	{
		rule: 'validation mode timing',
		name: 'with onSubmit nothing validates until validate is called',
		async run(createStore) {
			const store = createStore(fixture({ validationMode: 'onSubmit' }).options);
			store.setValue('name', '');
			store.blur('name');
			await settle();
			expect(errorsOf(store)).toEqual({});
			expect(await store.validate()).toBe(false);
			expect(errorsOf(store).name?.message).toBe('Name is required');
		},
	},
	{
		rule: 'validation mode timing',
		name: 'with onChange a change validates and a blur alone does not',
		async run(createStore) {
			const store = createStore(fixture({ validationMode: 'onChange', defaultValues: { name: '' } }).options);
			store.blur('name');
			await settle();
			expect(errorsOf(store)).toEqual({});
			store.setValue('name', 'Ada');
			store.setValue('name', '');
			await vi.waitFor(() => expect(errorsOf(store).name?.message).toBe('Name is required'));
			expect(store.getSnapshot().checkFailed).toBe(false);
		},
	},
	{
		rule: 'validation mode timing',
		name: 'with onBlur a blur validates and a change alone does not',
		async run(createStore) {
			const store = createStore(fixture({ validationMode: 'onBlur' }).options);
			store.setValue('name', '');
			await settle();
			expect(errorsOf(store)).toEqual({});
			store.blur('name');
			await vi.waitFor(() => expect(errorsOf(store).name?.message).toBe('Name is required'));
		},
	},
	{
		rule: 'validation mode timing',
		name: 'with all both a change and a blur validate',
		async run(createStore) {
			const store = createStore(fixture({ validationMode: 'all' }).options);
			store.setValue('name', '');
			await vi.waitFor(() => expect(errorsOf(store).name).toBeDefined());
			store.setValue('name', 'Ada');
			await vi.waitFor(() => expect(errorsOf(store).name).toBeUndefined());
			store.setValue('nickname', '');
			await vi.waitFor(() => expect(errorsOf(store).nickname).toBeDefined());
			store.setValue('nickname', 'ada');
			await vi.waitFor(() => expect(errorsOf(store).nickname).toBeUndefined());
			store.setValue('name', '');
			await vi.waitFor(() => expect(errorsOf(store).name).toBeDefined());
			store.blur('name');
			await vi.waitFor(() => expect(store.getSnapshot().touched.name).toBe(true));
			expect(errorsOf(store).name?.message).toBe('Name is required');
		},
	},
	{
		rule: 'validation mode timing',
		name: 'validates only the path that changed',
		async run(createStore) {
			const store = createStore(
				fixture({ validationMode: 'onChange', defaultValues: { name: '', nickname: 'ada' } }).options,
			);
			store.setValue('nickname', '');
			await vi.waitFor(() => expect(errorsOf(store).nickname?.message).toBe('Nickname is required'));
			expect(errorsOf(store).name).toBeUndefined();
		},
	},
	{
		rule: 're-validation after a failed check',
		name: 'after a failed validate the paths re-validate on change under reValidateMode onChange',
		async run(createStore) {
			const store = createStore(fixture({ validationMode: 'onSubmit', reValidateMode: 'onChange' }).options);
			store.setValue('name', '');
			expect(await store.validate()).toBe(false);
			expect(store.getSnapshot().checkFailed).toBe(true);
			store.setValue('name', 'Ada');
			await vi.waitFor(() => expect(errorsOf(store).name).toBeUndefined());
			store.setValue('name', '');
			await vi.waitFor(() => expect(errorsOf(store).name?.message).toBe('Name is required'));
		},
	},
	{
		rule: 're-validation after a failed check',
		name: 'reValidateMode onBlur re-validates on blur only, and onSubmit not at all',
		async run(createStore) {
			const onBlur = createStore(fixture({ validationMode: 'onSubmit', reValidateMode: 'onBlur' }).options);
			onBlur.setValue('name', '');
			await onBlur.validate();
			onBlur.setValue('name', 'Ada');
			await settle();
			expect(errorsOf(onBlur).name).toBeDefined();
			onBlur.blur('name');
			await vi.waitFor(() => expect(errorsOf(onBlur).name).toBeUndefined());

			const onSubmit = createStore(fixture({ validationMode: 'onSubmit', reValidateMode: 'onSubmit' }).options);
			onSubmit.setValue('name', '');
			await onSubmit.validate();
			onSubmit.setValue('name', 'Ada');
			onSubmit.blur('name');
			await settle();
			expect(errorsOf(onSubmit).name).toBeDefined();
		},
	},
	{
		rule: 're-validation after a failed check',
		name: 'a failed check of some paths does not turn on re-validation for the others',
		async run(createStore) {
			const store = createStore(fixture({ validationMode: 'onSubmit', reValidateMode: 'onChange' }).options);
			store.setValue('name', '');
			expect(await store.validate(['name'])).toBe(false);
			store.setValue('nickname', '');
			await settle();
			expect(errorsOf(store).nickname).toBeUndefined();
			store.setValue('name', 'Ada');
			await vi.waitFor(() => expect(errorsOf(store).name).toBeUndefined());
		},
	},
	{
		rule: 're-validation after a failed check',
		name: 'a passing validate does not start re-validation, and reset ends it',
		async run(createStore) {
			const store = createStore(fixture({ validationMode: 'onSubmit', reValidateMode: 'onChange' }).options);
			expect(await store.validate()).toBe(true);
			expect(store.getSnapshot().checkFailed).toBe(false);
			store.setValue('name', '');
			await settle();
			expect(errorsOf(store)).toEqual({});

			expect(await store.validate()).toBe(false);
			expect(store.getSnapshot().checkFailed).toBe(true);
			store.reset();
			expect(store.getSnapshot().checkFailed).toBe(false);
			store.setValue('name', '');
			await settle();
			expect(errorsOf(store)).toEqual({});
		},
	},
	{
		rule: 'silent validity check',
		name: 'checkValidity reports validity and changes nothing, not even for subscribers',
		async run(createStore) {
			const store = createStore(fixture().options);
			store.setValue('name', '');
			const before = store.getSnapshot();
			const listener = vi.fn();
			store.subscribe(listener);
			expect(await store.checkValidity()).toBe(false);
			expect(await store.checkValidity(['nickname'])).toBe(true);
			expect(store.getSnapshot()).toBe(before);
			expect(listener).not.toHaveBeenCalled();
			expect(errorsOf(store)).toEqual({});
			expect(store.getSnapshot().checkFailed).toBe(false);
		},
	},
	{
		rule: 'touched and dirty',
		name: 'touched is set by a blur, not by a change, and cleared by reset',
		run(createStore) {
			const store = createStore(fixture().options);
			store.setValue('name', 'Grace');
			expect(store.getSnapshot().touched).toEqual({});
			store.blur('name');
			expect(store.getSnapshot().touched).toEqual({ name: true });
			const touched = store.getSnapshot().touched;
			store.blur('name');
			expect(store.getSnapshot().touched).toBe(touched);
			store.reset();
			expect(store.getSnapshot().touched).toEqual({});
		},
	},
	{
		rule: 'touched and dirty',
		name: 'dirty follows the difference from the defaults, up through the containers',
		run(createStore) {
			const store = createStore(fixture().options);
			expect(store.getSnapshot().dirty).toEqual({});
			store.setValue('address.street', '2 Side');
			expect(store.getSnapshot().dirty).toEqual({ address: true, 'address.street': true });
			store.setValue('address.street', '1 Main');
			expect(store.getSnapshot().dirty).toEqual({});
			store.setValue('contacts.1.email', 'x@example.com');
			expect(store.getSnapshot().dirty).toEqual({ contacts: true, 'contacts.1': true, 'contacts.1.email': true });
			store.setValue('name', 'Grace');
			store.reset();
			expect(store.getSnapshot().dirty).toEqual({});
		},
	},
	{
		rule: 'touched and dirty',
		name: 'reset with values makes them the new defaults',
		run(createStore) {
			const store = createStore(fixture().options);
			store.setValue('name', 'Grace');
			store.reset({ name: 'Hedy' });
			expect(store.getSnapshot().values).toEqual({ name: 'Hedy' });
			expect(store.getSnapshot().dirty).toEqual({});
			store.setValue('name', 'Ada');
			expect(store.getSnapshot().dirty).toEqual({ name: true });
			store.reset();
			expect(store.getValue('name')).toBe('Hedy');
		},
	},
	{
		rule: 'array reindexing',
		name: 'swap moves rows with their ids, errors and touched state in one update',
		run(createStore) {
			const store = createStore(fixture().options);
			store.setErrors('server', { 'contacts.0.email': error('zero'), 'contacts.1.email': error('one') });
			store.blur('contacts.1.email');
			const [first, second, third] = ids(store);
			const listener = vi.fn(() => {
				const snapshot = store.getSnapshot();
				expect(snapshot.rowIds.contacts).toEqual([second, first, third]);
				expect(contacts(store)).toEqual(['b@example.com', 'a@example.com', 'c@example.com']);
				expect(snapshot.errors['contacts.0.email']?.message).toBe('one');
				expect(snapshot.errors['contacts.1.email']?.message).toBe('zero');
				expect(snapshot.touched).toEqual({ 'contacts.0.email': true });
			});
			store.subscribe(listener);
			store.fieldArray('contacts').swap(0, 1);
			expect(listener).toHaveBeenCalledTimes(1);
		},
	},
	{
		rule: 'array reindexing',
		name: 'move, prepend, insert and remove shift state to the rows it belongs to',
		run(createStore) {
			const store = createStore(fixture().options);
			const array = store.fieldArray('contacts');
			const [first, second, third] = ids(store);
			store.setErrors('server', { 'contacts.2.email': error('two') });
			store.blur('contacts.2.email');

			array.move(2, 0);
			expect(ids(store)).toEqual([third, first, second]);
			expect(errorsOf(store)['contacts.0.email']?.message).toBe('two');
			expect(store.getSnapshot().touched).toEqual({ 'contacts.0.email': true });

			array.prepend({ email: 'new@example.com' });
			expect(ids(store).slice(1)).toEqual([third, first, second]);
			expect(Object.keys(errorsOf(store))).toEqual(['contacts.1.email']);

			array.insert(1, { email: 'mid@example.com' });
			expect(Object.keys(errorsOf(store))).toEqual(['contacts.2.email']);
			expect(ids(store).slice(2)).toEqual([third, first, second]);

			array.remove(0);
			expect(Object.keys(errorsOf(store))).toEqual(['contacts.1.email']);
			expect(store.getSnapshot().touched).toEqual({ 'contacts.1.email': true });

			array.remove(1);
			expect(errorsOf(store)).toEqual({});
			expect(store.getSnapshot().touched).toEqual({});
			expect(contacts(store)).toEqual(['mid@example.com', 'a@example.com', 'b@example.com']);
			expect(array.fields.map(({ id }) => id)).toEqual(ids(store));
		},
	},
	{
		rule: 'array reindexing',
		name: 'append keeps existing rows and ids, and an array value appends several rows',
		run(createStore) {
			const store = createStore(fixture().options);
			const before = ids(store);
			store.fieldArray('contacts').append([{ email: 'x@example.com' }, { email: 'y@example.com' }]);
			expect(ids(store).slice(0, 3)).toEqual(before);
			expect(ids(store)).toHaveLength(5);
			expect(new Set(ids(store)).size).toBe(5);
			expect(contacts(store).slice(3)).toEqual(['x@example.com', 'y@example.com']);
		},
	},
	{
		rule: 'array reindexing',
		name: 'update and replace give the rows new ids and drop their state',
		run(createStore) {
			const store = createStore(fixture().options);
			const array = store.fieldArray('contacts');
			const before = ids(store);
			store.setErrors('server', { 'contacts.0.email': error('zero'), 'contacts.1.email': error('one') });
			store.blur('contacts.0.email');
			array.update(1, { email: 'u@example.com' });
			expect(ids(store)[0]).toBe(before[0]);
			expect(ids(store)[1]).not.toBe(before[1]);
			expect(ids(store)[2]).toBe(before[2]);
			expect(Object.keys(errorsOf(store))).toEqual(['contacts.0.email']);
			expect(store.getSnapshot().touched).toEqual({ 'contacts.0.email': true });

			array.replace([{ email: 'r@example.com' }]);
			expect(ids(store)).toHaveLength(1);
			expect(before).not.toContain(ids(store)[0]);
			expect(errorsOf(store)).toEqual({});
			expect(store.getSnapshot().touched).toEqual({});
		},
	},
	{
		rule: 'array reindexing',
		name: 'an operation naming a row that does not exist does nothing, and remove removes each row once',
		run(createStore) {
			const store = createStore(fixture().options);
			const array = store.fieldArray('contacts');
			const before = store.getSnapshot();
			const listener = vi.fn();
			store.subscribe(listener);
			array.swap(0, 5);
			array.move(-1, 0);
			array.move(0, 3);
			array.update(3, { email: 'z@example.com' });
			array.insert(4, { email: 'z@example.com' });
			array.insert(1.5, { email: 'z@example.com' });
			array.remove(7);
			array.remove([]);
			expect(listener).not.toHaveBeenCalled();
			expect(store.getSnapshot()).toBe(before);

			array.insert(3, { email: 'end@example.com' });
			expect(contacts(store)).toHaveLength(4);
			array.remove([0, 0, 9]);
			expect(contacts(store)).toEqual(['b@example.com', 'c@example.com', 'end@example.com']);
			array.remove();
			expect(contacts(store)).toEqual([]);
			expect(store.getSnapshot().rowIds.contacts).toEqual([]);
		},
	},
	{
		rule: 'array reindexing',
		name: 'adopts row ids already rendered, only when there is one per row',
		run(createStore) {
			const store = createStore(fixture().options);
			store.adoptRowIds('contacts', ['a', 'b']);
			expect(ids(store)).not.toEqual(['a', 'b']);
			store.adoptRowIds('contacts', ['a', 'b', 'c']);
			expect(ids(store)).toEqual(['a', 'b', 'c']);
			expect(store.fieldArray('contacts').fields).toEqual([{ id: 'a' }, { id: 'b' }, { id: 'c' }]);
			store.fieldArray('contacts').remove(0);
			expect(ids(store)).toEqual(['b', 'c']);
		},
	},
	{
		rule: 'array reindexing',
		name: 'keeps row ids by position when a branch is replaced with the same number of rows',
		run(createStore) {
			const store = createStore(fixture().options);
			const before = ids(store);
			store.setValue('contacts', [{ email: '1' }, { email: '2' }, { email: '3' }]);
			expect(ids(store)).toEqual(before);
			store.setValue('contacts', [{ email: '1' }]);
			expect(ids(store)).toEqual(before.slice(0, 1));
		},
	},
	{
		rule: 'error source precedence',
		name: 'an explicit source beats validation, and the source set most recently beats the others',
		async run(createStore) {
			const store = createStore(fixture().options);
			store.setValue('name', '');
			await store.validate();
			expect(errorsOf(store).name?.message).toBe('Name is required');

			store.setErrors('server', { name: error('Server says no') });
			expect(errorsOf(store).name?.message).toBe('Server says no');
			store.setErrors('host', { name: error('Host says no') });
			expect(errorsOf(store).name?.message).toBe('Host says no');
			store.setErrors('server', { name: error('Server again') });
			expect(errorsOf(store).name?.message).toBe('Server again');

			store.setErrors('server', {});
			expect(errorsOf(store).name?.message).toBe('Host says no');
			store.setErrors('host', {});
			expect(errorsOf(store).name?.message).toBe('Name is required');
		},
	},
	{
		rule: 'error source precedence',
		name: 'a source cannot write validation, and an edit clears explicit errors below its path only',
		async run(createStore) {
			const store = createStore(fixture().options);
			expect(() => store.setErrors('validation', { name: error('x') })).toThrow();
			store.setErrors('server', {
				name: error('name'),
				nickname: error('nickname'),
				'address.street': error('street'),
			});
			store.setValue('name', 'Grace');
			expect(Object.keys(errorsOf(store)).toSorted()).toEqual(['address.street', 'nickname']);
			store.setValue('address', { street: '2', country: 'FR' });
			expect(Object.keys(errorsOf(store))).toEqual(['nickname']);
		},
	},
	{
		rule: 'stale async results',
		name: 'applies an async result that is still current',
		async run(createStore) {
			const { options, gate } = fixture();
			const store = createStore(options);
			gate.hold('taken');
			store.setValue('slug', 'taken');
			const run = store.validate(['slug']);
			await vi.waitFor(() => expect(gate.pending('taken')).toBe(1));
			expect(store.getSnapshot().isValidating).toBe(true);
			gate.settle('taken', false);
			expect(await run).toBe(false);
			expect(errorsOf(store).slug?.message).toBe('Value is taken');
			expect(store.getSnapshot().isValidating).toBe(false);
		},
	},
	{
		rule: 'stale async results',
		name: 'drops a result that arrives after a reset',
		async run(createStore) {
			const { options, gate } = fixture();
			const store = createStore(options);
			gate.hold('taken');
			store.setValue('slug', 'taken');
			const run = store.validate(['slug']);
			await vi.waitFor(() => expect(gate.pending('taken')).toBe(1));
			store.reset();
			gate.settle('taken', false);
			await run;
			expect(errorsOf(store)).toEqual({});
			expect(store.getSnapshot().checkFailed).toBe(false);
			expect(store.getSnapshot().isValidating).toBe(false);
		},
	},
	{
		rule: 'stale async results',
		name: 'drops a result for rows that moved while it was running',
		async run(createStore) {
			const { options, gate } = fixture();
			const store = createStore(options);
			gate.hold('one', 'two');
			const run = store.validate(['invites']);
			await vi.waitFor(() => expect(gate.pending('one')).toBe(1));
			store.fieldArray('invites').swap(0, 1);
			gate.settle('one', false);
			gate.settle('two', true);
			await run;
			expect(errorsOf(store)).toEqual({});
			expect(store.getSnapshot().isValidating).toBe(false);
		},
	},
	{
		rule: 'stale async results',
		name: 'drops a result for a path whose value was written while it was running',
		async run(createStore) {
			const { options, gate } = fixture();
			const store = createStore(options);
			gate.hold('taken');
			store.setValue('slug', 'taken');
			const run = store.validate(['slug']);
			await vi.waitFor(() => expect(gate.pending('taken')).toBe(1));
			store.setValue('slug', 'free');
			gate.settle('taken', false);
			await run;
			expect(errorsOf(store).slug).toBeUndefined();
		},
	},
];

/** Every rule of the contract, for a test that checks a deliberately broken store fails the rule it breaks. */
export const formStoreCases: readonly FormStoreCase[] = cases;

/**
 * Registers the internal form store contract as vitest tests against the store `createStore` builds.
 *
 * @remarks
 * Call it from a test file, like `rendererConformance`. A fresh store is built for each test.
 */
export function formStoreConformance(createStore: FormStoreFactory): void {
	describe('form store conformance', () => {
		for (const rule of new Set(cases.map((entry) => entry.rule))) {
			describe(rule, () => {
				for (const entry of cases.filter((candidate) => candidate.rule === rule)) {
					test(entry.name, () => entry.run(createStore));
				}
			});
		}
	});
}

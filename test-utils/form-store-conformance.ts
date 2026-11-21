import { describe, expect, test, vi } from 'vitest';
import * as z from 'zod/mini';
import { markNormalizedElementConfig } from '../packages/forms/src/lib/normalized-form-config';
import type { ElementConfig } from '../packages/forms/src/schemas/field-config';
import { createDefaultValidationRegistry } from '../packages/forms/src/schemas/validation/validation-registry';
import { toFieldArrayValue } from '../packages/forms/src/store/field-array';
import { selectFieldState } from '../packages/forms/src/store/selectors';
import {
	FORM_PATH,
	type FormStateContainer,
	type FormStateContainerFactory,
	type FormStateContainerOptions,
} from '../packages/forms/src/store/types';

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
	readonly run: (createStore: FormStateContainerFactory) => void | Promise<void>;
}

/**
 * An async validation rule that passes at once, except for the values a test holds, which it settles by
 * hand so a result can arrive after a reset or a row move.
 */
function createGate() {
	const waiting = new Map<string, Array<(valid: boolean) => void>>();
	const held = new Set<string>();
	const settled = new Map<string, boolean>();
	return {
		hold: (...values: string[]): void => values.forEach((value) => held.add(value)),
		check: (value: unknown): Promise<boolean> =>
			settled.has(String(value))
				? Promise.resolve(settled.get(String(value)) === true)
				: !held.has(String(value))
					? Promise.resolve(true)
					: new Promise((resolve) => {
							const key = String(value);
							waiting.set(key, [...(waiting.get(key) ?? []), resolve]);
						}),
		pending: (value: string): number => waiting.get(value)?.length ?? 0,
		settle(value: string, valid: boolean): void {
			settled.set(value, valid);
			for (const resolve of waiting.get(value) ?? []) resolve(valid);
			waiting.delete(value);
		},
	};
}

const element = (config: Record<string, unknown>, containerKind?: 'array' | 'object') =>
	markNormalizedElementConfig(config as unknown as ElementConfig, containerKind);

interface Fixture {
	readonly options: FormStateContainerOptions;
	readonly gate: ReturnType<typeof createGate>;
}

function fixture(overrides: Partial<FormStateContainerOptions> = {}): Fixture {
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
			validationMode: 'onSubmit',
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
						name: 'groups',
						elements: [
							{ $type: 'input', name: 'title' },
							{
								$type: 'arrayElements',
								name: 'members',
								elements: [
									{ $type: 'input', name: 'code', rules: [{ type: 'gate' }] },
									{ $type: 'input', name: 'label' },
								],
							},
						],
					},
					'array',
				),
				element(
					{
						$type: 'arrayElements',
						name: 'invites',
						rules: [{ type: 'minItems', value: 2, message: 'Add two invites' }],
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

/**
 * Records whether a validation the store started was ever running, as a subscriber sees it.
 *
 * @remarks
 * A check that nothing validated cannot pass vacuously on a short wait: every validation the store
 * starts is observable as `isValidating` while it runs.
 */
export function watchValidation(store: FormStateContainer): { readonly started: boolean } {
	const watch = { started: false };
	store.subscribe(() => {
		if (store.getSnapshot().isValidating) watch.started = true;
	});
	return watch;
}

/** The paths of a flat map of marks, in order. */
const marked = (marks: object): string[] => Object.keys(marks).toSorted();

const error = (message: string) => ({ type: 'custom', message });
const settle = () => new Promise<void>((resolve) => setTimeout(resolve, 5));
const errorsOf = (store: FormStateContainer) => store.getSnapshot().errors;
const contacts = (store: FormStateContainer) =>
	(store.getSnapshot().values.contacts as Array<{ email: string }>).map((row) => row.email);

/** The row ids of `contacts`, in row order. */
const ids = (store: FormStateContainer) => store.getSnapshot().rowIds.contacts ?? [];

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
			expect(() => {
				(snapshot.dirty as Record<string, unknown>).name = true;
			}).toThrow(TypeError);
			expect(() => {
				(snapshot.rowIds as Record<string, unknown>).contacts = [];
			}).toThrow(TypeError);
			expect(() => {
				(snapshot.rowIds.contacts as string[]).push('x');
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

			const valuesBeforeBlur = store.getSnapshot().values;
			store.blur('name');
			expect(store.getSnapshot().values).toBe(valuesBeforeBlur);
			expect(store.getSnapshot().values.contacts).toBe(rows);
		},
	},
	{
		rule: 'field state per exact path',
		name: 'keeps errors, touched and dirty as flat maps by exact path, stable while unrelated state changes',
		run(createStore) {
			const store = createStore(fixture().options);
			store.setErrors('server', { 'contacts.1.email': error('one'), nickname: error('nick') });
			store.blur('contacts.1.email');
			store.setValue('address.street', '2 Side');
			const { errors, touched, dirty, defaults } = store.getSnapshot();
			expect(errors).toEqual({ 'contacts.1.email': error('one'), nickname: error('nick') });
			expect(touched).toEqual({ 'contacts.1.email': true });
			expect(dirty).toEqual({ 'address.street': true });
			expect(defaults.address).toEqual({ street: '1 Main', country: 'IT' });

			store.setValue('name', 'Grace');
			const after = store.getSnapshot();
			expect(after.errors).toBe(errors);
			expect(after.touched).toBe(touched);
			expect(after.defaults).toBe(defaults);
			expect(after.dirty).not.toBe(dirty);
		},
	},
	{
		rule: 'field state per exact path',
		name: 'an error is never inherited: a container and a row inside it can both have one',
		run(createStore) {
			const store = createStore(fixture().options);
			store.setErrors('server', { contacts: error('too few'), 'contacts.0.email': error('row') });
			expect(Object.keys(errorsOf(store)).toSorted()).toEqual(['contacts', 'contacts.0.email']);
			expect(store.getFieldState('contacts').error?.message).toBe('too few');
			expect(store.getFieldState('contacts.0.email').error?.message).toBe('row');
			expect(store.getFieldState('contacts.1.email').error).toBeUndefined();
			expect(store.getSnapshot().isValid).toBe(false);
		},
	},
	{
		rule: 'field state per exact path',
		name: 'an error about the form is its own entry and is no field error',
		async run(createStore) {
			const store = createStore(fixture().options);
			store.setErrors('server', { [FORM_PATH]: error('Try again later') });
			expect(errorsOf(store)).toEqual({ '': error('Try again later') });
			expect(store.getFieldState('name').error).toBeUndefined();
			expect(store.getFieldState('contacts.0.email').invalid).toBe(false);
			expect(store.getSnapshot().isValid).toBe(false);
			expect(await store.validate(['name'])).toBe(true);
			expect(await store.validate()).toBe(false);
			store.setValue('name', 'Grace');
			expect(errorsOf(store)).toEqual({});
			expect(store.getSnapshot().isValid).toBe(true);
		},
	},
	{
		rule: 'field state per exact path',
		name: 'editing a path drops the errors a host set there, below it and around it, and keeps the others',
		run(createStore) {
			const store = createStore(fixture().options);
			store.setErrors('server', {
				[FORM_PATH]: error('form'),
				contacts: error('array'),
				'contacts.0': error('row'),
				'contacts.0.email': error('field'),
				'contacts.1.email': error('sibling'),
				nickname: error('other'),
			});
			store.setValue('contacts.0.email', 'new@example.com');
			expect(Object.keys(errorsOf(store)).toSorted()).toEqual(['contacts.1.email', 'nickname']);
		},
	},
	{
		rule: 'field state per exact path',
		name: 'touched marks cover the fields below them, and dirty marks do not cover but report below',
		run(createStore) {
			const store = createStore(fixture().options);
			store.blur('address');
			expect(store.getFieldState('address.street').isTouched).toBe(true);
			expect(store.getFieldState('address').isTouched).toBe(true);
			expect(store.getFieldState('name').isTouched).toBe(false);
			store.setValue('address.street', '2 Side');
			expect(store.getFieldState('address').isDirty).toBe(true);
			expect(store.getFieldState('address.country').isDirty).toBe(false);
		},
	},
	{
		rule: 'field state in the shape of the values',
		name: 'getFieldState reports error, touched and dirty for a path',
		run(createStore) {
			const store = createStore(fixture().options);
			expect(store.getFieldState('name')).toEqual({
				error: undefined,
				invalid: false,
				isTouched: false,
				isDirty: false,
			});
			store.setValue('name', 'Grace');
			store.blur('name');
			store.setErrors('server', { name: error('no') });
			expect(store.getFieldState('name')).toEqual({
				error: error('no'),
				invalid: true,
				isTouched: true,
				isDirty: true,
			});
			store.setValue('address.street', '2 Side');
			expect(store.getFieldState('address')).toMatchObject({ isDirty: true, isTouched: false });
		},
	},
	{
		rule: 'snapshot stability',
		name: 'selectFieldState gives the same object for a snapshot and path, and a new one once its state changed',
		run(createStore) {
			const store = createStore(fixture().options);
			const before = store.getSnapshot();
			expect(selectFieldState(before, 'name')).toBe(selectFieldState(before, 'name'));
			expect(store.getFieldState('name')).toBe(selectFieldState(before, 'name'));
			store.blur('name');
			const after = store.getSnapshot();
			expect(selectFieldState(after, 'name')).not.toBe(selectFieldState(before, 'name'));
			expect(selectFieldState(after, 'name').isTouched).toBe(true);
			expect(selectFieldState(before, 'name').isTouched).toBe(false);
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
		rule: 'snapshot stability',
		name: 'notifies once per command even when the command starts a validation',
		run(createStore) {
			const change = createStore(fixture({ validationMode: 'onChange' }).options);
			const onChange = vi.fn();
			change.subscribe(onChange);
			change.setValue('name', '');
			expect(onChange).toHaveBeenCalledTimes(1);
			expect(change.getSnapshot().isValidating).toBe(true);
			change.fieldArray('contacts').swap(0, 1);
			expect(onChange).toHaveBeenCalledTimes(2);

			const blur = createStore(fixture({ validationMode: 'onBlur' }).options);
			const onBlur = vi.fn();
			blur.subscribe(onBlur);
			blur.blur('name');
			expect(onBlur).toHaveBeenCalledTimes(1);
			expect(blur.getSnapshot().isValidating).toBe(true);
		},
	},
	{
		rule: 'validation mode timing',
		name: 'an empty list of paths validates nothing, and undefined validates the form',
		async run(createStore) {
			const store = createStore(fixture({ defaultValues: { name: '', nickname: '' } }).options);
			const watch = watchValidation(store);
			expect(await store.validate([])).toBe(true);
			expect(await store.checkValidity([])).toBe(true);
			expect(watch.started).toBe(false);
			expect(await store.checkValidity()).toBe(false);
		},
	},
	{
		rule: 'validation mode timing',
		name: 'a row operation validates the array own rules, and the rows inside it are not validated',
		async run(createStore) {
			const { options, gate } = fixture({ validationMode: 'onChange', defaultValues: { invites: [] } });
			const store = createStore(options);
			gate.hold('x');
			store.fieldArray('invites').append({ code: 'x', label: 'first' });
			await vi.waitFor(() => expect(errorsOf(store).invites?.message).toBe('Add two invites'));
			expect(gate.pending('x')).toBe(0);
			expect(errorsOf(store)['invites.0.code']).toBeUndefined();
			expect(store.getSnapshot().isValidating).toBe(false);
		},
	},
	{
		rule: 'validation mode timing',
		name: 'with onSubmit nothing validates until validate is called',
		async run(createStore) {
			const store = createStore(fixture({ validationMode: 'onSubmit' }).options);
			const watch = watchValidation(store);
			store.setValue('name', '');
			store.blur('name');
			await settle();
			expect(watch.started).toBe(false);
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
			const watch = watchValidation(store);
			store.blur('name');
			await settle();
			expect(watch.started).toBe(false);
			expect(errorsOf(store)).toEqual({});
			store.setValue('name', 'Ada');
			store.setValue('name', '');
			await vi.waitFor(() => expect(errorsOf(store).name?.message).toBe('Name is required'));
		},
	},
	{
		rule: 'validation mode timing',
		name: 'with onBlur a blur validates and a change alone does not',
		async run(createStore) {
			const store = createStore(fixture({ validationMode: 'onBlur' }).options);
			const watch = watchValidation(store);
			store.setValue('name', '');
			await settle();
			expect(watch.started).toBe(false);
			expect(errorsOf(store)).toEqual({});
			store.blur('name');
			await vi.waitFor(() => expect(errorsOf(store).name?.message).toBe('Name is required'));
		},
	},
	{
		rule: 'validation mode timing',
		name: 'with all both a change and a blur validate',
		async run(createStore) {
			const onChange = createStore(fixture({ validationMode: 'all' }).options);
			onChange.setValue('name', '');
			await vi.waitFor(() => expect(errorsOf(onChange).name).toBeDefined());
			onChange.setValue('name', 'Ada');
			await vi.waitFor(() => expect(errorsOf(onChange).name).toBeUndefined());

			const onBlur = createStore(fixture({ validationMode: 'all', defaultValues: { name: '' } }).options);
			expect(errorsOf(onBlur)).toEqual({});
			onBlur.blur('name');
			await vi.waitFor(() => expect(errorsOf(onBlur).name?.message).toBe('Name is required'));
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
			const changeWatch = watchValidation(onBlur);
			onBlur.setValue('name', 'Ada');
			await settle();
			expect(changeWatch.started).toBe(false);
			expect(errorsOf(onBlur).name).toBeDefined();
			onBlur.blur('name');
			await vi.waitFor(() => expect(errorsOf(onBlur).name).toBeUndefined());

			const onSubmit = createStore(fixture({ validationMode: 'onSubmit', reValidateMode: 'onSubmit' }).options);
			onSubmit.setValue('name', '');
			await onSubmit.validate();
			const submitWatch = watchValidation(onSubmit);
			onSubmit.setValue('name', 'Ada');
			onSubmit.blur('name');
			await settle();
			expect(submitWatch.started).toBe(false);
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
			const watch = watchValidation(store);
			store.setValue('nickname', '');
			await settle();
			expect(watch.started).toBe(false);
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
			const afterPass = watchValidation(store);
			store.setValue('name', '');
			await settle();
			expect(afterPass.started).toBe(false);
			expect(errorsOf(store)).toEqual({});

			expect(await store.validate()).toBe(false);
			store.reset();
			const afterReset = watchValidation(store);
			store.setValue('name', '');
			await settle();
			expect(afterReset.started).toBe(false);
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
		name: 'dirty follows the difference from the defaults, and appending a row does not make the rows before it dirty',
		run(createStore) {
			const store = createStore(fixture().options);
			expect(store.getSnapshot().dirty).toEqual({});
			store.setValue('address.street', '2 Side');
			expect(marked(store.getSnapshot().dirty)).toEqual(['address.street']);
			store.setValue('address.street', '1 Main');
			expect(store.getSnapshot().dirty).toEqual({});
			store.setValue('contacts.1.email', 'x@example.com');
			expect(marked(store.getSnapshot().dirty)).toEqual(['contacts.1.email']);
			store.setValue('contacts.1.email', 'b@example.com');
			store.fieldArray('contacts').append({ email: 'x@example.com' });
			expect(marked(store.getSnapshot().dirty)).toEqual(['contacts', 'contacts.3.email']);
			store.setValue('name', 'Grace');
			store.reset();
			expect(store.getSnapshot().dirty).toEqual({});
		},
	},
	{
		rule: 'touched and dirty',
		name: 'reset without values restores the defaults and clears every source of state',
		async run(createStore) {
			const store = createStore(fixture({ validationMode: 'onSubmit' }).options);
			store.setValue('name', '');
			store.blur('name');
			store.setErrors('server', { nickname: error('no') });
			expect(await store.validate()).toBe(false);
			store.reset();
			const snapshot = store.getSnapshot();
			expect(snapshot.values.name).toBe('Ada');
			expect(snapshot.errors).toEqual({});
			expect(snapshot.touched).toEqual({});
			expect(snapshot.dirty).toEqual({});
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
				expect(marked(snapshot.touched)).toEqual(['contacts.0.email']);
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
			expect(marked(store.getSnapshot().touched)).toEqual(['contacts.0.email']);

			array.prepend({ email: 'new@example.com' });
			expect(ids(store).slice(1)).toEqual([third, first, second]);
			expect(Object.keys(errorsOf(store))).toEqual(['contacts.1.email']);

			array.insert(1, { email: 'mid@example.com' });
			expect(Object.keys(errorsOf(store))).toEqual(['contacts.2.email']);
			expect(ids(store).slice(2)).toEqual([third, first, second]);

			array.remove(0);
			expect(Object.keys(errorsOf(store))).toEqual(['contacts.1.email']);
			expect(marked(store.getSnapshot().touched)).toEqual(['contacts.1.email']);

			array.remove(1);
			expect(errorsOf(store)).toEqual({});
			expect(store.getSnapshot().touched).toEqual({});
			expect(contacts(store)).toEqual(['mid@example.com', 'a@example.com', 'b@example.com']);
			expect(toFieldArrayValue(ids(store), array).fields.map(({ id }) => id)).toEqual(ids(store));
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
			expect(marked(store.getSnapshot().touched)).toEqual(['contacts.0.email']);

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
		name: 'nested and scalar arrays carry their rows state, and shrinking drops it',
		run(createStore) {
			const store = createStore(
				fixture({
					defaultValues: {
						groups: [
							{ title: 'a', members: [{ label: 'x' }, { label: 'y' }] },
							{ title: 'b', members: [{ label: 'z' }] },
						],
						tags: ['p', 'q', 'r'],
					},
				}).options,
			);
			store.setErrors('server', {
				'groups.0.members.1.label': error('inner'),
				'tags.1': error('scalar'),
			});
			store.blur('groups.0.members.1.label');
			store.blur('tags.2');

			store.fieldArray('groups').swap(0, 1);
			expect(Object.keys(errorsOf(store)).toSorted()).toEqual(['groups.1.members.1.label', 'tags.1']);
			expect(marked(store.getSnapshot().touched).toSorted()).toEqual(['groups.1.members.1.label', 'tags.2']);

			store.fieldArray('groups.1.members').remove(0);
			expect(Object.keys(errorsOf(store)).toSorted()).toEqual(['groups.1.members.0.label', 'tags.1']);

			store.fieldArray('tags').remove(0);
			expect(Object.keys(errorsOf(store)).toSorted()).toEqual(['groups.1.members.0.label', 'tags.0']);
			expect(marked(store.getSnapshot().touched).toSorted()).toEqual(['groups.1.members.0.label', 'tags.1']);

			store.setValue('groups', [{ title: 'only', members: [] }]);
			expect(Object.keys(errorsOf(store))).toEqual(['tags.0']);
			expect(marked(store.getSnapshot().touched)).toEqual(['tags.1']);
			expect(store.getSnapshot().rowIds['groups.0.members']).toEqual([]);
		},
	},
	{
		rule: 'array reindexing',
		name: 'adopts the row ids of a snapshot rendered elsewhere, for the arrays whose row count matches',
		run(createStore) {
			const store = createStore(
				fixture({ rowIds: { contacts: ['a', 'b', 'c'], invites: ['only-one'] } }).options,
			);
			expect(ids(store)).toEqual(['a', 'b', 'c']);
			expect(store.getSnapshot().rowIds.invites).toHaveLength(2);
			expect(store.getSnapshot().rowIds.invites).not.toContain('only-one');
			store.fieldArray('contacts').remove(0);
			expect(ids(store)).toEqual(['b', 'c']);
			store.fieldArray('contacts').append({ email: 'new@example.com' });
			expect(new Set(ids(store)).size).toBe(3);
		},
	},
	{
		rule: 'array reindexing',
		name: 'a branch written over rows drops the state of rows that no longer exist',
		async run(createStore) {
			const store = createStore(fixture().options);
			store.setErrors('server', { 'contacts.2.email': error('two') });
			store.blur('contacts.2.email');
			store.setValue('contacts.2.email', '');
			expect(await store.validate(['contacts.2.email'])).toBe(false);
			store.setValue('contacts', [{ email: 'a@example.com' }]);
			expect(errorsOf(store)).toEqual({});
			expect(store.getSnapshot().touched).toEqual({});
			store.fieldArray('contacts').append({ email: 'fresh@example.com' });
			store.fieldArray('contacts').append({ email: '' });
			expect(errorsOf(store)).toEqual({});
			expect(store.getSnapshot().touched).toEqual({});
			const watch = watchValidation(store);
			store.setValue('contacts.2.email', 'changed@example.com');
			await settle();
			expect(watch.started).toBe(false);
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
		name: 'server beats the container validation, which beats native, whatever order they were set in',
		async run(createStore) {
			const store = createStore(fixture().options);
			store.setErrors('server', { name: error('Server says no') });
			store.setErrors('native', { name: error('Fill in this field'), nickname: error('Native nick') });
			expect(errorsOf(store).name?.message).toBe('Server says no');
			expect(errorsOf(store).nickname?.message).toBe('Native nick');

			const other = createStore(fixture({ defaultValues: { name: '', nickname: '' } }).options);
			await other.validate();
			expect(errorsOf(other).name?.message).toBe('Name is required');
			other.setErrors('native', { name: error('Fill in this field') });
			expect(errorsOf(other).name?.message).toBe('Name is required');
			other.setErrors('server', { name: error('Server says no') });
			expect(errorsOf(other).name?.message).toBe('Server says no');
			other.setErrors('server', {});
			expect(errorsOf(other).name?.message).toBe('Name is required');
		},
	},
	{
		rule: 'error source precedence',
		name: 'validate resolves false while an error from any source remains at the validated paths',
		async run(createStore) {
			const store = createStore(fixture().options);
			store.setErrors('native', { name: error('Fill in this field') });
			expect(await store.validate(['name'])).toBe(false);
			expect(await store.validate(['nickname'])).toBe(true);
			expect(await store.validate()).toBe(false);
			store.setErrors('native', {});
			expect(await store.validate()).toBe(true);
		},
	},
	{
		rule: 'error source precedence',
		name: 'a source may give a type or a message or neither, and the error still counts',
		async run(createStore) {
			const store = createStore(fixture().options);
			store.setErrors('server', {
				name: { message: 'Taken' },
				nickname: {},
				'address.street': { type: 'native' },
			});
			const { errors } = store.getSnapshot();
			expect(errors.name).toEqual({ type: 'server', message: 'Taken' });
			expect(errors.nickname).toEqual({ type: 'server', message: '' });
			expect(errors['address.street']).toEqual({ type: 'native', message: '' });
			expect(await store.validate(['nickname'])).toBe(false);
		},
	},
	{
		rule: 'error source precedence',
		name: 'checkValidity counts every source like validate does, without writing',
		async run(createStore) {
			const store = createStore(fixture().options);
			store.setErrors('native', { name: error('Fill in this field') });
			const before = store.getSnapshot();
			expect(await store.checkValidity(['name'])).toBe(false);
			expect(await store.checkValidity(['nickname'])).toBe(true);
			expect(await store.checkValidity()).toBe(false);
			store.setErrors('native', {});
			expect(await store.checkValidity()).toBe(true);
			store.setValue('name', '');
			expect(await store.checkValidity()).toBe(false);
			expect(store.getSnapshot().errors).toEqual({});
			expect(before.errors).toEqual({ name: error('Fill in this field') });
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
			const { options, gate } = fixture({ validationMode: 'onChange', defaultValues: { slug: 'taken' } });
			const store = createStore(options);
			gate.hold('taken');
			store.setValue('slug', 'other');
			store.setValue('slug', 'taken');
			await vi.waitFor(() => expect(gate.pending('taken')).toBe(1));
			store.reset();
			expect(store.getValue('slug')).toBe('taken');
			gate.settle('taken', false);
			await vi.waitFor(() => expect(store.getSnapshot().isValidating).toBe(false));
			expect(errorsOf(store)).toEqual({});
		},
	},
	{
		rule: 'stale async results',
		name: 'applies a late result to the row it was for after the rows moved',
		async run(createStore) {
			const { options, gate } = fixture({
				validationMode: 'onBlur',
				defaultValues: {
					invites: [
						{ code: 'one', label: 'first' },
						{ code: 'one', label: 'second' },
					],
				},
			});
			const store = createStore(options);
			gate.hold('one');
			store.blur('invites.0.code');
			await vi.waitFor(() => expect(gate.pending('one')).toBe(1));
			store.fieldArray('invites').swap(0, 1);
			gate.settle('one', false);
			await vi.waitFor(() => expect(store.getSnapshot().isValidating).toBe(false));
			expect(store.getValue('invites.1.label')).toBe('first');
			expect(Object.keys(errorsOf(store))).toEqual(['invites.1.code']);
			expect(marked(store.getSnapshot().touched)).toEqual(['invites.1.code']);
		},
	},
	{
		rule: 'stale async results',
		name: 'drops a late result for a row that was removed',
		async run(createStore) {
			const { options, gate } = fixture({
				validationMode: 'onBlur',
				defaultValues: {
					invites: [
						{ code: 'one', label: 'first' },
						{ code: 'one', label: 'second' },
					],
				},
			});
			const store = createStore(options);
			gate.hold('one');
			store.blur('invites.0.code');
			await vi.waitFor(() => expect(gate.pending('one')).toBe(1));
			store.fieldArray('invites').remove(0);
			gate.settle('one', false);
			await vi.waitFor(() => expect(store.getSnapshot().isValidating).toBe(false));
			expect(errorsOf(store)).toEqual({});
		},
	},
	{
		rule: 'stale async results',
		name: 'a validate that a reset overtook is dropped and not run again against the defaults',
		async run(createStore) {
			const { options, gate } = fixture({ defaultValues: { name: 'Ada', slug: 'taken' } });
			const store = createStore(options);
			gate.hold('taken');
			const run = store.validate(['slug']);
			await vi.waitFor(() => expect(gate.pending('taken')).toBe(1));
			store.setValue('slug', 'other');
			store.reset();
			const watch = watchValidation(store);
			gate.settle('taken', false);
			await run;
			expect(watch.started).toBe(false);
			expect(gate.pending('taken')).toBe(0);
			expect(errorsOf(store)).toEqual({});
			expect(store.getSnapshot().isValidating).toBe(false);
		},
	},
	{
		rule: 'stale async results',
		name: 'drops a late result when its rows were replaced',
		async run(createStore) {
			const { options, gate } = fixture({
				validationMode: 'onBlur',
				defaultValues: { invites: [{ code: 'one', label: 'first' }] },
			});
			const store = createStore(options);
			gate.hold('one');
			store.blur('invites.0.code');
			await vi.waitFor(() => expect(gate.pending('one')).toBe(1));
			store.fieldArray('invites').replace([{ code: 'one', label: 'second' }]);
			gate.settle('one', false);
			await vi.waitFor(() => expect(store.getSnapshot().isValidating).toBe(false));
			expect(errorsOf(store)).toEqual({});
		},
	},
	{
		rule: 'stale async results',
		name: 'follows a nested row when the rows around it move',
		async run(createStore) {
			const { options, gate } = fixture({
				validationMode: 'onBlur',
				defaultValues: {
					groups: [
						{ title: 'a', members: [{ code: 'x' }, { code: 'one' }] },
						{ title: 'b', members: [{ code: 'y' }] },
					],
				},
			});
			const store = createStore(options);
			gate.hold('one');
			store.blur('groups.0.members.1.code');
			await vi.waitFor(() => expect(gate.pending('one')).toBe(1));
			store.fieldArray('groups').swap(0, 1);
			store.fieldArray('groups.1.members').remove(0);
			gate.settle('one', false);
			await vi.waitFor(() => expect(store.getSnapshot().isValidating).toBe(false));
			expect(Object.keys(errorsOf(store))).toEqual(['groups.1.members.0.code']);
		},
	},
	{
		rule: 'stale async results',
		name: 'an explicit validate that lost part of its result resolves with the current validity',
		async run(createStore) {
			const { options, gate } = fixture();
			const store = createStore(options);
			gate.hold('one', 'two');
			const run = store.validate(['invites']);
			await vi.waitFor(() => expect(gate.pending('one')).toBe(1));
			store.fieldArray('invites').swap(0, 1);
			gate.settle('one', false);
			gate.settle('two', true);
			expect(await run).toBe(false);
			expect(Object.keys(errorsOf(store))).toEqual(['invites.1.code']);
			expect(store.getSnapshot().isValidating).toBe(false);
		},
	},
	{
		rule: 'stale async results',
		name: 'drops a result for a path whose value was written while it was running, and resolves with the current validity',
		async run(createStore) {
			const { options, gate } = fixture();
			const store = createStore(options);
			gate.hold('taken');
			store.setValue('slug', 'taken');
			const run = store.validate(['slug']);
			await vi.waitFor(() => expect(gate.pending('taken')).toBe(1));
			store.setValue('slug', 'free');
			gate.settle('taken', false);
			expect(await run).toBe(true);
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
export function formStoreConformance(createStore: FormStateContainerFactory): void {
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

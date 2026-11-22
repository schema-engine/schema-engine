import { describe, expect, test, vi } from 'vitest';
import * as z from 'zod/mini';
import { markNormalizedElementConfig } from '../packages/forms/src/lib/normalized-form-config';
import type { ElementConfig } from '../packages/forms/src/schemas/field-config';
import { createDefaultValidationRegistry } from '../packages/forms/src/schemas/validation/validation-registry';
import { logger } from '../packages/forms/src/lib/logger';
import { toFieldArrayValue } from '../packages/forms/src/state-container/field-array';
import {
	selectError,
	selectErrorsUnder,
	selectFieldState,
	selectValue,
	selectWarning,
} from '../packages/forms/src/state-container/selectors';
import {
	FORM_ROOT,
	type FormStateContainer,
	type FormStateContainerFactory,
	type FormStateContainerOptions,
} from '../packages/forms/src/state-container/types';

/**
 * One rule of the internal form store contract, with the check that proves it.
 *
 * @remarks
 * `run` throws when the store breaks the rule. {@link formStateContainerCases} lists them so a test can point a
 * deliberately broken store at the rule it breaks; {@link formStateContainerConformance} registers them as tests.
 */
export interface FormStateContainerCase {
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
				element({
					$type: 'input',
					name: 'code',
					rules: [
						{ type: 'minLength', value: 5, message: 'Too short' },
						{ type: 'pattern', value: '^\\d+$', message: 'Digits only' },
					],
				}),
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
			defaults: {
				name: 'Ada',
				nickname: 'ada',
				slug: 'free',
				code: '12345',
				address: { street: '1 Main', country: 'IT' },
				contacts: [{ email: 'a@example.com' }, { email: 'b@example.com' }, { email: 'c@example.com' }],
				invites: [{ code: 'one' }, { code: 'two' }],
			},
			...overrides,
		},
	};
}

const containerKinds: Record<string, 'array' | 'object'> = { arrayElements: 'array', fieldset: 'object' };

/** A container over `elements` with the default rules and a rule, `boom`, that throws when it runs. */
function custom(
	configs: ReadonlyArray<Record<string, unknown>>,
	defaults: Record<string, unknown>,
	overrides: Partial<FormStateContainerOptions> = {},
): FormStateContainerOptions {
	const registry = createDefaultValidationRegistry([
		{
			$type: 'boom',
			schema: z.object({ type: z.literal('boom') }),
			metadata: { name: 'Boom' },
			category: 'generic',
			handler: () =>
				z.any().check(
					z.refine(() => {
						throw new Error('exploded');
					}),
				),
		},
	]);
	return {
		registry,
		validationMode: 'onSubmit',
		elements: configs.map((config) => element(config, containerKinds[String(config.$type)])),
		defaults,
		...overrides,
	};
}

/** Two fields in a business form: `company` is required and shown only for a business. */
const businessForm = (defaults: Record<string, unknown> = { kind: 'person', company: '' }) =>
	custom(
		[
			{ $type: 'input', name: 'kind' },
			{
				$type: 'input',
				name: 'company',
				rules: [{ type: 'required', id: 'company-required', message: 'Company is required' }],
				constraints: [{ field: 'kind', action: 'show', operator: 'equals', value: 'business' }],
			},
		],
		defaults,
	);

/** Two fields whose second must equal the first. */
const passwordForm = () =>
	custom(
		[
			{ $type: 'input', name: 'password' },
			{ $type: 'input', name: 'confirm', rules: [{ type: 'relate', fields: ['password'], assert: 'allEqual' }] },
		],
		{ password: 'a', confirm: 'b' },
	);

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

const cases: FormStateContainerCase[] = [
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
			const store = createStore(fixture({ defaults: defaults }).options);
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
			expect(Object.keys(errors).toSorted()).toEqual(['contacts.1.email', 'nickname']);
			expect(errors.nickname).toMatchObject({ message: 'nick', source: 'server' });
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
			store.setErrors('server', { [FORM_ROOT]: error('Try again later') });
			expect(Object.keys(errorsOf(store))).toEqual([FORM_ROOT]);
			expect(errorsOf(store)[FORM_ROOT]).toMatchObject({ message: 'Try again later' });
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
				[FORM_ROOT]: error('form'),
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
				warning: undefined,
				invalid: false,
				isTouched: false,
				isDirty: false,
				isValidating: false,
			});
			store.setValue('name', 'Grace');
			store.blur('name');
			store.setErrors('server', { name: error('no') });
			expect(store.getFieldState('name')).toMatchObject({
				error: { message: 'no' },
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
		name: 'selectValue and selectError read a snapshot by exact path and keep their reference while it holds',
		run(createStore) {
			const store = createStore(fixture().options);
			const before = store.getSnapshot();
			expect(selectValue(before, 'address')).toBe(before.values.address);
			expect(selectValue(before, 'contacts.1.email')).toBe('b@example.com');
			store.setErrors('server', { contacts: error('array') });
			store.setValue('name', 'Grace');
			const after = store.getSnapshot();
			expect(selectValue(after, 'address')).toBe(selectValue(before, 'address'));
			expect(selectError(after, 'contacts')?.message).toBe('array');
			expect(selectError(after, 'contacts.0.email')).toBeUndefined();
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
			const store = createStore(fixture({ defaults: { name: '', nickname: '' } }).options);
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
			const { options, gate } = fixture({ validationMode: 'onChange', defaults: { invites: [] } });
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
			const store = createStore(fixture({ validationMode: 'onChange', defaults: { name: '' } }).options);
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

			const onBlur = createStore(fixture({ validationMode: 'all', defaults: { name: '' } }).options);
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
				fixture({ validationMode: 'onChange', defaults: { name: '', nickname: 'ada' } }).options,
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
					defaults: {
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
		rule: 'error sources',
		name: 'lists the server, then each failed rule in rule order, then the native fact, and shows the first',
		async run(createStore) {
			const store = createStore(fixture().options);
			store.setValue('code', 'ab', { native: { type: 'patternMismatch', params: { pattern: '[0-9]+' } } });
			store.setErrors('server', { code: { message: 'Taken' } });
			expect(await store.validate(['code'])).toBe(false);
			const shown = errorsOf(store).code;
			expect(shown.all).toEqual([
				{ type: 'server', message: 'Taken', source: 'server' },
				{ type: 'minLength', source: 'validation', params: { minLength: 5 }, message: 'Too short' },
				{ type: 'pattern', source: 'validation', params: { pattern: '^\\d+$' }, message: 'Digits only' },
				{ type: 'patternMismatch', source: 'native', params: { pattern: '[0-9]+' } },
			]);
			const { all, ...fields } = shown;
			expect(fields).toEqual(all[0]);

			store.setErrors('server', {});
			const withoutServer = errorsOf(store).code;
			expect(withoutServer.message).toBe('Too short');
			expect(withoutServer.all).toHaveLength(3);
		},
	},
	{
		rule: 'error sources',
		name: 'native validity is an input to validation: it shows with the timing of validation, and notifies nobody alone',
		async run(createStore) {
			const store = createStore(fixture({ validationMode: 'onSubmit' }).options);
			expect(
				await store.validate(['name'], { native: { name: { type: 'valueMissing', message: 'Fill in' } } }),
			).toBe(false);
			expect(errorsOf(store).name).toMatchObject({ source: 'native', type: 'valueMissing', message: 'Fill in' });

			const listener = vi.fn();
			store.subscribe(listener);
			expect(await store.validate(['name'], { native: { name: null } })).toBe(true);
			expect(errorsOf(store)).toEqual({});

			const quiet = createStore(fixture({ validationMode: 'onSubmit' }).options);
			quiet.blur('name', { native: { type: 'valueMissing' } });
			expect(errorsOf(quiet)).toEqual({});

			const onChange = createStore(fixture({ validationMode: 'onChange' }).options);
			onChange.setValue('nickname', 'nick', { native: { type: 'valueMissing', message: 'Fill in this field' } });
			await vi.waitFor(() => expect(errorsOf(onChange).nickname?.source).toBe('native'));
			expect(errorsOf(onChange).nickname.message).toBe('Fill in this field');
		},
	},
	{
		rule: 'error sources',
		name: 'validate and checkValidity count native facts and server errors alike, and checkValidity writes nothing',
		async run(createStore) {
			const store = createStore(fixture().options);
			store.blur('name', { native: { type: 'valueMissing' } });
			const before = store.getSnapshot();
			expect(await store.checkValidity(['name'])).toBe(false);
			expect(await store.checkValidity(['nickname'])).toBe(true);
			expect(await store.checkValidity()).toBe(false);
			expect(store.getSnapshot()).toBe(before);
			expect(await store.validate()).toBe(false);
			store.blur('name', { native: null });
			expect(await store.checkValidity()).toBe(true);
			expect(await store.validate()).toBe(true);

			store.setErrors('server', { name: { message: 'Taken' } });
			expect(await store.checkValidity()).toBe(false);
			expect(await store.validate()).toBe(false);
		},
	},
	{
		rule: 'error sources',
		name: 'a cleared server source lets validate pass, and the form-level error alone blocks it',
		async run(createStore) {
			const store = createStore(fixture().options);
			store.setErrors('server', { [FORM_ROOT]: { message: 'Service unavailable' } });
			expect(await store.validate()).toBe(false);
			expect(await store.validate(['name'])).toBe(true);
			store.setErrors('server', {});
			expect(await store.validate()).toBe(true);
			expect(errorsOf(store)).toEqual({});
		},
	},
	{
		rule: 'error sources',
		name: 'a source may give a type or a message or neither, and the error still counts',
		async run(createStore) {
			const store = createStore(fixture().options);
			store.setErrors('server', {
				name: { message: 'Taken' },
				nickname: {},
				'address.street': { type: 'taken' },
			});
			const { errors } = store.getSnapshot();
			expect(errors.name).toMatchObject({ type: 'server', message: 'Taken', source: 'server' });
			expect(errors.nickname).toEqual({
				type: 'server',
				source: 'server',
				all: [{ type: 'server', source: 'server' }],
			});
			expect(errors['address.street']).toMatchObject({ type: 'taken', source: 'server' });
			expect(errors['address.street'].message).toBeUndefined();
			expect(await store.validate(['nickname'])).toBe(false);
		},
	},
	{
		rule: 'error sources',
		name: 'identical errors change nothing and keep their objects, and a changed one replaces only its own',
		run(createStore) {
			const store = createStore(fixture().options);
			store.setErrors('server', { name: { message: 'Taken' }, nickname: { message: 'Taken' } });
			const before = store.getSnapshot();
			const listener = vi.fn();
			store.subscribe(listener);
			store.setErrors('server', { name: { message: 'Taken' }, nickname: { message: 'Taken' } });
			expect(listener).not.toHaveBeenCalled();
			expect(store.getSnapshot()).toBe(before);

			store.setErrors('server', { name: { message: 'Taken' }, nickname: { message: 'Other' } });
			const after = store.getSnapshot();
			expect(after.errors.name).toBe(before.errors.name);
			expect(after.errors.nickname).not.toBe(before.errors.nickname);
			expect(selectFieldState(after, 'name')).toBe(selectFieldState(before, 'name'));
		},
	},
	{
		rule: 'error sources',
		name: 'a validation that finds the same thing again keeps its error objects, and reset clears native facts',
		async run(createStore) {
			const store = createStore(fixture({ defaults: { name: '' } }).options);
			await store.validate(['name']);
			const first = store.getSnapshot();
			await store.validate(['name']);
			expect(store.getSnapshot().errors.name).toBe(first.errors.name);
			expect(selectFieldState(store.getSnapshot(), 'name')).toBe(selectFieldState(first, 'name'));

			store.blur('nickname', { native: { type: 'valueMissing' } });
			store.reset();
			store.setValue('nickname', '');
			expect(await store.validate()).toBe(false);
			expect(errorsOf(store).nickname.all.map(({ source }) => source)).toEqual(['validation']);
		},
	},
	{
		rule: 'error sources',
		name: 'selectErrorsUnder lists the errors at and below a path, and keeps its object while they are unchanged',
		run(createStore) {
			const store = createStore(fixture().options);
			store.setErrors('server', {
				contacts: { message: 'few' },
				'contacts.1.email': { message: 'row' },
				name: { message: 'n' },
			});
			const before = store.getSnapshot();
			expect(Object.keys(selectErrorsUnder(before, 'contacts')).toSorted()).toEqual([
				'contacts',
				'contacts.1.email',
			]);
			expect(Object.keys(selectErrorsUnder(before, 'contacts.1'))).toEqual(['contacts.1.email']);
			expect(selectErrorsUnder(before, 'address')).toEqual({});
			expect(selectErrorsUnder(before, 'contacts')).toBe(selectErrorsUnder(before, 'contacts'));
			store.blur('address');
			expect(selectErrorsUnder(store.getSnapshot(), 'contacts')).toBe(selectErrorsUnder(before, 'contacts'));
			store.setErrors('server', {
				contacts: { message: 'few' },
				'contacts.1.email': { message: 'row' },
				name: { message: 'other name' },
			});
			expect(selectErrorsUnder(store.getSnapshot(), 'contacts')).toBe(selectErrorsUnder(before, 'contacts'));
			expect(selectErrorsUnder(store.getSnapshot(), 'name')).not.toBe(selectErrorsUnder(before, 'name'));
		},
	},
	{
		rule: 'array reindexing',
		name: 'toFieldArrayValue gives the same object while the rows are the same, and the commands are one object per path',
		run(createStore) {
			const store = createStore(fixture().options);
			const commands = store.fieldArray('contacts');
			expect(store.fieldArray('contacts')).toBe(commands);
			const rows = store.getSnapshot().rowIds.contacts;
			expect(toFieldArrayValue(rows, commands)).toBe(toFieldArrayValue(rows, commands));
			store.setValue('name', 'Grace');
			expect(toFieldArrayValue(store.getSnapshot().rowIds.contacts, commands)).toBe(
				toFieldArrayValue(rows, commands),
			);
			commands.append({ email: 'x@example.com' });
			expect(toFieldArrayValue(store.getSnapshot().rowIds.contacts, commands)).not.toBe(
				toFieldArrayValue(rows, commands),
			);
		},
	},
	{
		rule: 'array reindexing',
		name: 'warns when given row ids that do not match the rows, and keeps the ones it minted',
		run(createStore) {
			const warn = vi.spyOn(logger, 'warn').mockReturnThis();
			try {
				const store = createStore(
					fixture({ rowIds: { contacts: ['a', 'b'], name: ['x'], invites: ['k', 'k'] } }).options,
				);
				expect(warn).toHaveBeenCalledTimes(3);
				expect(ids(store)).toHaveLength(3);
				expect(ids(store)).not.toContain('a');
			} finally {
				warn.mockRestore();
			}
		},
	},
	{
		rule: 'error sources',
		name: 'refuses a source a host cannot set, a reserved path, and a row that does not exist',
		run(createStore) {
			const store = createStore(fixture().options);
			const values = store.getSnapshot().values;
			// @ts-expect-error only the server source can be set by a host
			expect(() => store.setErrors('values', {})).toThrow(/Unknown error source 'values'/);
			// @ts-expect-error only the server source can be set by a host
			expect(() => store.setErrors('native', {})).toThrow(/Unknown error source 'native'/);
			expect(store.getSnapshot().values).toBe(values);
			expect(() => store.setErrors('server', { __secret: { message: 'x' } })).toThrow(
				/reserved segment '__secret'/,
			);
			expect(() => store.setErrors('server', { 'contacts.__proto__.email': { message: 'x' } })).toThrow(
				/reserved/,
			);
			expect(() => store.blur(FORM_ROOT)).toThrow(/reserved/);
			expect(() => store.setValue('__x', 1)).toThrow(/reserved/);
			expect(() => store.blur('__x', { native: { type: 'valueMissing' } })).toThrow(/reserved/);
			expect(() => store.setErrors('server', { 'contacts.4.email': { message: 'bounced' } })).toThrow(
				/'contacts.4.email' names row '4' of 'contacts', which has 3 rows/,
			);
			expect(() => store.setErrors('server', { 'contacts.x': { message: 'x' } })).toThrow(/names row 'x'/);
			expect(() => store.setErrors('server', { 'contacts.-1.email': { message: 'x' } })).toThrow(
				/names row '-1'/,
			);
			expect(() => store.setErrors('server', { 'contacts.1e-7.email': { message: 'x' } })).toThrow(
				/names row '1e-7'/,
			);
			expect(() => store.setErrors('server', { 'contacts.01.email': { message: 'x' } })).toThrow(
				/names row '01'/,
			);
			expect(store.getSnapshot().errors).toEqual({});
			expect(() =>
				store.setErrors('server', { 'nothing.here': { message: 'fine' }, [FORM_ROOT]: { message: 'form' } }),
			).not.toThrow();
			expect(Object.keys(errorsOf(store)).toSorted()).toEqual([FORM_ROOT, 'nothing.here']);
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
			expect(errorsOf(store).slug?.type).toBe('gate');
			expect(store.getSnapshot().isValidating).toBe(false);
		},
	},
	{
		rule: 'stale async results',
		name: 'drops a result that arrives after a reset',
		async run(createStore) {
			const { options, gate } = fixture({ validationMode: 'onChange', defaults: { slug: 'taken' } });
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
				defaults: {
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
				defaults: {
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
			const { options, gate } = fixture({ defaults: { name: 'Ada', slug: 'taken' } });
			const store = createStore(options);
			gate.hold('taken');
			const run = store.validate(['slug']);
			await vi.waitFor(() => expect(gate.pending('taken')).toBe(1));
			store.setValue('slug', 'other');
			store.reset();
			const watch = watchValidation(store);
			gate.settle('taken', false);
			expect(await run).toBe(false);
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
				defaults: { invites: [{ code: 'one', label: 'first' }] },
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
				defaults: {
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
	{
		rule: 'freshness',
		name: 'a second edit during a validation retry resolves false, not the validity of a value it never checked',
		async run(createStore) {
			const { options, gate } = fixture();
			const store = createStore(options);
			gate.settle('taken', false);
			gate.hold('a', 'b');
			store.setValue('slug', 'a');
			const run = store.validate(['slug']);
			await vi.waitFor(() => expect(gate.pending('a')).toBe(1));
			store.setValue('slug', 'b');
			gate.settle('a', true);
			await vi.waitFor(() => expect(gate.pending('b')).toBe(1));
			store.setValue('slug', 'taken');
			gate.settle('b', true);
			expect(await run).toBe(false);
			expect(await store.validate(['slug'])).toBe(false);
		},
	},
	{
		rule: 'freshness',
		name: 'a retry checks the rows it was asked about after they moved, not the ones now at those indexes',
		async run(createStore) {
			const { options, gate } = fixture();
			const store = createStore(options);
			gate.hold('one');
			const run = store.validate(['invites.0.code']);
			await vi.waitFor(() => expect(gate.pending('one')).toBe(1));
			store.fieldArray('invites').swap(0, 1);
			gate.settle('one', false);
			expect(await run).toBe(false);
			expect(Object.keys(errorsOf(store))).toEqual(['invites.1.code']);
		},
	},
	{
		rule: 'freshness',
		name: 'a check whose rows were removed, or that a reset overtook, resolves false and writes nothing',
		async run(createStore) {
			const { options, gate } = fixture();
			const store = createStore(options);
			gate.hold('two');
			const removed = store.validate(['invites.1.code']);
			await vi.waitFor(() => expect(gate.pending('two')).toBe(1));
			store.fieldArray('invites').remove(1);
			gate.settle('two', false);
			expect(await removed).toBe(false);
			expect(errorsOf(store)).toEqual({});

			const other = createStore(fixture().options);
			const held = fixture();
			held.gate.hold('one');
			const reset = createStore(held.options);
			const overtaken = reset.validate(['invites.0.code']);
			await vi.waitFor(() => expect(held.gate.pending('one')).toBe(1));
			reset.reset();
			held.gate.settle('one', false);
			expect(await overtaken).toBe(false);
			expect(errorsOf(reset)).toEqual({});
			expect(await other.validate()).toBe(true);
		},
	},
	{
		rule: 'freshness',
		name: 'checkValidity answers for the values, facts and errors current when it was called, and never mixes in later ones',
		async run(createStore) {
			const { options, gate } = fixture();
			const store = createStore(options);
			store.setValue('invites.0.code', 'free');
			gate.hold('free');
			const first = store.checkValidity(['invites.0.code']);
			await vi.waitFor(() => expect(gate.pending('free')).toBe(1));
			store.setErrors('server', { 'invites.0.code': { type: 'late' } });
			store.setValue('invites.0.code', 'other');
			gate.settle('free', true);
			expect(await first).toBe(true);
			expect(await store.checkValidity(['invites.0.code'])).toBe(true);
			store.setValue('invites.0.code', 'free', { native: { type: 'valueMissing' } });
			expect(await store.checkValidity(['invites.0.code'])).toBe(false);
		},
	},
	{
		rule: 'submission-bound validation',
		name: 'an edit during validation followed by a passing retry leaves the token holding the edited values, and the server answer for them applies',
		async run(createStore) {
			const store = createStore(fixture().options);
			const submission = store.beginSubmission();
			expect(submission.values).toEqual(store.getSnapshot().values);
			const run = store.validate(undefined, { submission });
			store.setValue('nickname', 'ada2');
			expect(await run).toBe(true);
			expect(submission.values.nickname).toBe('ada2');
			expect(submission.values).toEqual(store.getSnapshot().values);
			expect(Object.isFrozen(submission.values)).toBe(true);
			store.setErrors('server', { nickname: { type: 'taken' } }, { submission });
			expect(errorsOf(store).nickname?.type).toBe('taken');
		},
	},
	{
		rule: 'submission-bound validation',
		name: 'a validation that fails leaves the values of the token as they were, and an edit after a pass drops only the answers for what it touched',
		async run(createStore) {
			const store = createStore(fixture().options);
			const submission = store.beginSubmission();
			const before = submission.values;
			store.setValue('name', '');
			expect(await store.validate(undefined, { submission })).toBe(false);
			expect(submission.values).toBe(before);

			store.setValue('name', 'Grace');
			expect(await store.validate(undefined, { submission })).toBe(true);
			expect(submission.values.name).toBe('Grace');
			store.setValue('nickname', 'changed');
			store.setErrors('server', { name: { type: 'taken' }, nickname: { type: 'taken' } }, { submission });
			expect(Object.keys(errorsOf(store))).toEqual(['name']);
		},
	},
	{
		rule: 'submission-bound validation',
		name: 'a token that a reset or a later submission superseded does not capture, and the values of a token are plain frozen data',
		async run(createStore) {
			const store = createStore(fixture().options);
			const old = store.beginSubmission();
			const current = store.beginSubmission();
			store.setValue('name', 'Grace');
			expect(await store.validate(undefined, { submission: old })).toBe(true);
			expect(old.values.name).toBe('Ada');
			expect(await store.validate(undefined, { submission: current })).toBe(true);
			expect(current.values.name).toBe('Grace');
			expect(current.values).toBe(current.values);
		},
	},
	{
		rule: 'pending per field',
		name: 'lists the paths a check is running for, moves with a row, and drops a path a later check took over',
		async run(createStore) {
			const { options, gate } = fixture({ validationMode: 'onBlur' });
			const store = createStore(options);
			gate.hold('one');
			store.blur('invites.0.code');
			await vi.waitFor(() => expect(gate.pending('one')).toBe(1));
			expect(store.getSnapshot().validating).toEqual({ 'invites.0.code': true });
			expect(store.getSnapshot().isValidating).toBe(true);
			expect(store.getFieldState('invites.0.code').isValidating).toBe(true);
			expect(store.getFieldState('invites.1.code').isValidating).toBe(false);
			store.fieldArray('invites').swap(0, 1);
			expect(store.getSnapshot().validating).toEqual({ 'invites.1.code': true });
			gate.settle('one', true);
			await vi.waitFor(() => expect(store.getSnapshot().isValidating).toBe(false));
			expect(store.getSnapshot().validating).toEqual({});

			const racing = fixture();
			racing.gate.hold('a');
			const second = createStore(racing.options);
			second.setValue('slug', 'a');
			const older = second.validate(['slug']);
			await vi.waitFor(() => expect(racing.gate.pending('a')).toBe(1));
			second.setValue('slug', 'b');
			expect(await second.validate(['slug'])).toBe(true);
			expect(second.getSnapshot().validating).toEqual({});
			expect(second.getSnapshot().isValidating).toBe(true);
			racing.gate.settle('a', true);
			expect(await older).toBe(true);
			expect(second.getSnapshot().isValidating).toBe(false);
		},
	},
	{
		rule: 'pending per field',
		name: 'a superseded async check leaves no issue and no pending mark: pending is state, never an issue',
		async run(createStore) {
			vi.stubGlobal(
				'fetch',
				vi.fn(async () => new Response(JSON.stringify({ valid: true }))),
			);
			try {
				const store = createStore(
					custom(
						[
							{
								$type: 'input',
								name: 'handle',
								rules: [{ type: 'async', url: '/check', debounce: 30, disableCache: true }],
							},
						],
						{ handle: '' },
						{ validationMode: 'onChange' },
					),
				);
				store.setValue('handle', 'a');
				store.setValue('handle', 'ab');
				await vi.waitFor(() => expect(store.getSnapshot().isValidating).toBe(false), { timeout: 2000 });
				expect(errorsOf(store)).toEqual({});
				expect(store.getSnapshot().warnings).toEqual({});
				expect(store.getSnapshot().validating).toEqual({});
				expect(JSON.stringify(store.getSnapshot())).not.toMatch(/pending/i);
				expect(await store.validate()).toBe(true);
			} finally {
				vi.unstubAllGlobals();
			}
		},
	},
	{
		rule: 'server errors tied to a submission',
		name: 'a response for values that were edited since the submission began is dropped',
		run(createStore) {
			const store = createStore(fixture().options);
			store.setErrors('server', { name: { type: 'old' } });
			const submission = store.beginSubmission();
			expect(errorsOf(store)).toEqual({});
			store.setValue('name', 'Grace');
			store.setErrors('server', { name: { type: 'taken' }, nickname: { type: 'blocked' } }, { submission });
			expect(Object.keys(errorsOf(store))).toEqual(['nickname']);
			store.setValue('nickname', 'other');
			expect(errorsOf(store)).toEqual({});

			const formWide = store.beginSubmission();
			store.setValue('slug', 'changed');
			store.setErrors('server', { [FORM_ROOT]: { type: 'invalid_credentials' } }, { submission: formWide });
			expect(errorsOf(store)).toEqual({});
		},
	},
	{
		rule: 'server errors tied to a submission',
		name: 'an error for a submitted row lands on that row wherever it is now, and is dropped when the row is gone',
		run(createStore) {
			const store = createStore(fixture().options);
			const submission = store.beginSubmission();
			store.fieldArray('contacts').swap(0, 1);
			store.setErrors(
				'server',
				{ 'contacts.0.email': { type: 'bounced' }, 'contacts.2.email': { type: 'blocked' } },
				{ submission },
			);
			expect(Object.keys(errorsOf(store)).toSorted()).toEqual(['contacts.1.email', 'contacts.2.email']);
			store.fieldArray('contacts').remove(2);
			const again = store.beginSubmission();
			store.fieldArray('contacts').remove(0);
			store.setErrors('server', { 'contacts.0.email': { type: 'bounced' } }, { submission: again });
			expect(errorsOf(store)).toEqual({});
		},
	},
	{
		rule: 'server errors tied to a submission',
		name: 'a cross-field error is dropped when a value its rules read changed, and cleared when one changes after it was applied',
		run(createStore) {
			const store = createStore(passwordForm());
			const stale = store.beginSubmission();
			store.setValue('password', 'b');
			store.setErrors('server', { confirm: { type: 'mismatch' } }, { submission: stale });
			expect(errorsOf(store)).toEqual({});

			store.setValue('password', 'a');
			const fresh = store.beginSubmission();
			store.setErrors('server', { confirm: { type: 'mismatch' } }, { submission: fresh });
			expect(errorsOf(store).confirm?.type).toBe('mismatch');
			store.setValue('password', 'b');
			expect(errorsOf(store)).toEqual({});

			store.setErrors('server', { confirm: { type: 'mismatch' } });
			expect(errorsOf(store).confirm?.type).toBe('mismatch');
			store.setValue('password', 'c');
			expect(errorsOf(store)).toEqual({});
		},
	},
	{
		rule: 'server errors tied to a submission',
		name: 'a token from before a reset or from a superseded submission is ignored',
		run(createStore) {
			const store = createStore(fixture().options);
			const reset = store.beginSubmission();
			store.reset();
			store.setErrors('server', { name: { type: 'taken' } }, { submission: reset });
			expect(errorsOf(store)).toEqual({});

			const first = store.beginSubmission();
			const second = store.beginSubmission();
			store.setErrors('server', { name: { type: 'taken' } }, { submission: first });
			expect(errorsOf(store)).toEqual({});
			store.setErrors('server', { name: { type: 'taken' } }, { submission: second });
			expect(errorsOf(store).name?.type).toBe('taken');
			expect(second.values).toEqual(store.getSnapshot().values);
		},
	},
	{
		rule: 'server errors tied to a submission',
		name: 'a path takes one issue or several, each with a code, params and an optional message',
		async run(createStore) {
			const store = createStore(fixture().options);
			const submission = store.beginSubmission();
			store.setErrors(
				'server',
				{
					name: [
						{ type: 'taken', message: 'Already registered' },
						{ type: 'blocked_domain', params: { domain: 'example.com' } },
					],
					nickname: [],
				},
				{ submission },
			);
			expect(Object.keys(errorsOf(store))).toEqual(['name']);
			expect(errorsOf(store).name.all).toEqual([
				{ type: 'taken', source: 'server', message: 'Already registered' },
				{ type: 'blocked_domain', source: 'server', params: { domain: 'example.com' } },
			]);
			store.setValue('name', '');
			store.setErrors('server', { name: [{ type: 'taken' }, { type: 'taken' }] });
			expect(await store.validate(['name'])).toBe(false);
			expect(errorsOf(store).name.all.map(({ source }) => source)).toEqual(['server', 'server', 'validation']);
		},
	},
	{
		rule: 'native facts',
		name: 'a fact describes the value it came with: a later write without one makes it stale, and a programmatic write never reuses it',
		async run(createStore) {
			const store = createStore(fixture({ validationMode: 'onChange' }).options);
			store.setValue('nickname', 'bad', { native: { type: 'typeMismatch' } });
			await vi.waitFor(() => expect(errorsOf(store).nickname?.source).toBe('native'));
			expect(await store.checkValidity(['nickname'])).toBe(false);
			store.setValue('nickname', 'good');
			await vi.waitFor(() => expect(errorsOf(store).nickname).toBeUndefined());
			expect(await store.checkValidity(['nickname'])).toBe(true);
			store.setValue('nickname', 'bad');
			await settle();
			expect(errorsOf(store).nickname).toBeUndefined();
			expect(await store.validate(['nickname'])).toBe(true);
		},
	},
	{
		rule: 'native facts',
		name: 'a write that leaves the value as it is changes nothing, whatever fact it carries',
		async run(createStore) {
			const store = createStore(fixture({ validationMode: 'onChange' }).options);
			store.setValue('nickname', 'nick');
			await settle();
			const watch = watchValidation(store);
			const before = store.getSnapshot();
			store.setValue('nickname', 'nick', { native: { type: 'badInput' } });
			await settle();
			expect(watch.started).toBe(false);
			expect(store.getSnapshot()).toBe(before);
			expect(await store.checkValidity(['nickname'])).toBe(true);
		},
	},
	{
		rule: 'native facts',
		name: 'reportNative binds a fact to the value held now, validates only a path already checked, and is no user change',
		async run(createStore) {
			const store = createStore(fixture({ validationMode: 'onChange' }).options);
			const listener = vi.fn();
			store.subscribe(listener);
			store.reportNative('nickname', { type: 'valueMissing' });
			await settle();
			expect(errorsOf(store)).toEqual({});
			expect(store.getSnapshot().dirty).toEqual({});
			expect(store.getSnapshot().touched).toEqual({});
			expect(listener).not.toHaveBeenCalled();
			expect(await store.checkValidity(['nickname'])).toBe(false);

			expect(await store.validate(['name'])).toBe(true);
			store.reportNative('name', { type: 'typeMismatch', params: { type: 'email' } });
			await vi.waitFor(() => expect(errorsOf(store).name?.type).toBe('typeMismatch'));
			store.reportNative('name', null);
			await vi.waitFor(() => expect(errorsOf(store).name).toBeUndefined());
			expect(store.getSnapshot().dirty).toEqual({});
		},
	},
	{
		rule: 'native facts',
		name: 'a reset form that hears from its controls again shows no error, and a path the container does not hold is ignored',
		async run(createStore) {
			const store = createStore(fixture({ validationMode: 'onChange' }).options);
			store.setValue('nickname', 'x', { native: { type: 'typeMismatch' } });
			await vi.waitFor(() => expect(errorsOf(store).nickname?.source).toBe('native'));
			store.reset();
			store.reportNative('nickname', { type: 'valueMissing' });
			store.reportNative('contacts.9.email', { type: 'valueMissing' });
			store.reportNative('nothing.here', { type: 'valueMissing' });
			await settle();
			expect(errorsOf(store)).toEqual({});
			expect(store.getSnapshot().isValid).toBe(true);
			store.fieldArray('contacts').remove(2);
			expect(() => store.reportNative('contacts.2.email', { type: 'valueMissing' })).not.toThrow();
			expect(() => store.reportNative('__x', { type: 'valueMissing' })).toThrow(/reserved/);
		},
	},
	{
		rule: 'native facts',
		name: 'a fact moves with its row, and a removed row never returns as a native error',
		async run(createStore) {
			const store = createStore(fixture().options);
			store.blur('contacts.1.label', { native: { type: 'typeMismatch' } });
			store.fieldArray('contacts').swap(1, 2);
			expect(await store.validate()).toBe(false);
			expect(Object.keys(errorsOf(store))).toEqual(['contacts.2.label']);
			store.fieldArray('contacts').remove(2);
			expect(await store.validate()).toBe(true);
			expect(errorsOf(store)).toEqual({});
		},
	},
	{
		rule: 'native facts',
		name: 'a flush is the whole truth: a control that is not in the map is not counted, for validate and for checkValidity',
		async run(createStore) {
			const store = createStore(fixture().options);
			store.blur('name', { native: { type: 'valueMissing' } });
			store.blur('nickname', { native: { type: 'valueMissing' } });
			expect(await store.checkValidity()).toBe(false);
			expect(await store.checkValidity(undefined, { native: { nickname: null } })).toBe(true);
			expect(await store.checkValidity(undefined, { native: { name: { type: 'typeMismatch' } } })).toBe(false);
			expect(await store.checkValidity()).toBe(false);

			expect(await store.validate(undefined, { native: { nickname: { type: 'valueMissing' } } })).toBe(false);
			expect(Object.keys(errorsOf(store))).toEqual(['nickname']);
			expect(await store.validate(undefined, { native: {} })).toBe(true);
			expect(errorsOf(store)).toEqual({});
			expect(await store.checkValidity()).toBe(true);
		},
	},
	{
		rule: 'native facts',
		name: 'the facts a submit flushes with validate are judged by that validation, for the rows that exist',
		async run(createStore) {
			const store = createStore(fixture().options);
			expect(
				await store.validate(undefined, {
					native: { name: { type: 'valueMissing' }, 'contacts.9.email': { type: 'valueMissing' } },
				}),
			).toBe(false);
			expect(Object.keys(errorsOf(store))).toEqual(['name']);
			expect(await store.validate(undefined, { native: { name: null } })).toBe(true);
		},
	},
	{
		rule: 'native facts',
		name: 'a flush ignores a fact for a row that does not exist, and facts and params are copied so a caller cannot change a snapshot',
		async run(createStore) {
			const store = createStore(fixture().options);
			store.fieldArray('contacts').remove([0, 1, 2]);
			expect(() => store.blur('contacts.0.label', { native: { type: 'valueMissing' } })).toThrow(/names row/);
			store.setValue('contacts', null);
			await store.validate(undefined, {
				native: {
					'contacts.0.label': { type: 'valueMissing' },
					'contacts.1.label': { type: 'valueMissing' },
				},
			});
			expect(Object.keys(errorsOf(store)).filter((path) => path.endsWith('.label'))).toEqual([]);
			store.setValue('contacts', []);

			const allowed = ['first'];
			store.setErrors('server', { name: { type: 'invalid', params: { allowed } } });
			const fact = { type: 'rangeUnderflow', params: { list: ['a'] } };
			await store.validate(['nickname'], { native: { nickname: fact } });
			allowed.push('second');
			fact.params.list.push('b');
			expect(errorsOf(store).name.params).toEqual({ allowed: ['first'] });
			expect(errorsOf(store).nickname.params).toEqual({ list: ['a'] });
			expect(Object.isFrozen((errorsOf(store).name.params as { allowed: string[] }).allowed)).toBe(true);
		},
	},
	{
		rule: 'pending per field',
		name: 'a branch write that removes rows takes their pending marks with them',
		async run(createStore) {
			const { options, gate } = fixture();
			const store = createStore(options);
			gate.hold('two');
			const run = store.validate(['invites.1.code']);
			await vi.waitFor(() => expect(gate.pending('two')).toBe(1));
			expect(store.getSnapshot().validating).toEqual({ 'invites.1.code': true });
			store.setValue('invites', []);
			expect(store.getSnapshot().validating).toEqual({});
			gate.settle('two', true);
			expect(await run).toBe(false);
			expect(store.getSnapshot().validating).toEqual({});
			expect(store.getSnapshot().isValidating).toBe(false);
		},
	},
	{
		rule: 'participation',
		name: 'a field a constraint hides takes no part: it does not block, count or show, however it was recorded',
		async run(createStore) {
			const store = createStore(businessForm());
			expect(await store.validate()).toBe(true);
			expect(await store.checkValidity()).toBe(true);
			expect(errorsOf(store)).toEqual({});

			store.setValue('kind', 'business');
			expect(await store.validate()).toBe(false);
			expect(errorsOf(store).company).toMatchObject({ type: 'required', ruleId: 'company-required' });
			store.setValue('kind', 'person');
			expect(errorsOf(store)).toEqual({});
			expect(store.getSnapshot().isValid).toBe(true);
			expect(await store.validate()).toBe(true);

			store.setErrors('server', { company: { type: 'taken' } });
			store.blur('company', { native: { type: 'valueMissing' } });
			expect(store.getSnapshot().isValid).toBe(true);
			expect(await store.validate()).toBe(true);
			expect(await store.checkValidity()).toBe(true);
		},
	},
	{
		rule: 'participation',
		name: 'a path that takes part again is re-validated when it was checked before, and waits for its timing otherwise',
		async run(createStore) {
			const checked = createStore(businessForm({ kind: 'business', company: '' }));
			expect(await checked.validate()).toBe(false);
			checked.setValue('kind', 'person');
			expect(errorsOf(checked)).toEqual({});
			checked.setValue('kind', 'business');
			await vi.waitFor(() => expect(errorsOf(checked).company?.type).toBe('required'));

			const untouched = createStore(businessForm());
			untouched.setValue('kind', 'business');
			await settle();
			expect(errorsOf(untouched)).toEqual({});
			expect(untouched.getSnapshot().isValid).toBe(true);
		},
	},
	{
		rule: 'participation',
		name: 'disabled fields, authored or by a constraint, and everything inside an excluded container, are excluded; an inactive step is not',
		async run(createStore) {
			const store = createStore(
				custom(
					[
						{ $type: 'input', name: 'locked', disabled: true, rules: [{ type: 'required' }] },
						{ $type: 'input', name: 'mode' },
						{
							$type: 'input',
							name: 'frozen',
							rules: [{ type: 'required' }],
							constraints: [{ field: 'mode', action: 'enable', operator: 'equals', value: 'edit' }],
						},
						{
							$type: 'fieldset',
							name: 'extra',
							constraints: [{ field: 'mode', action: 'show', operator: 'equals', value: 'edit' }],
							elements: [{ $type: 'input', name: 'note', rules: [{ type: 'required' }] }],
						},
						{ $type: 'input', name: 'later', rules: [{ type: 'required' }] },
					],
					{ locked: '', mode: 'view', frozen: '', extra: { note: '' }, later: '' },
				),
			);
			expect(await store.validate()).toBe(false);
			expect(Object.keys(errorsOf(store))).toEqual(['later']);
			store.setValue('later', 'x');
			expect(await store.validate()).toBe(true);
			store.setValue('mode', 'edit');
			expect(await store.validate()).toBe(false);
			expect(Object.keys(errorsOf(store)).toSorted()).toEqual(['extra.note', 'frozen']);
		},
	},
	{
		rule: 'issue identity',
		name: 'every rule reports its type, id and params, two rules of one type stay apart, and a rule reports once',
		async run(createStore) {
			const store = createStore(
				custom(
					[
						{
							$type: 'input',
							name: 'tag',
							rules: [
								{ type: 'required', id: 'tag-required' },
								{ type: 'pattern', id: 'tag-letters', value: '^[a-z]+$', message: 'Letters only' },
								{ type: 'pattern', id: 'tag-short', value: '^.{0,3}$', message: 'Three at most' },
								{ type: 'minLength', value: 8 },
							],
						},
					],
					{ tag: 'AB1234' },
				),
			);
			expect(await store.validate()).toBe(false);
			const { all } = errorsOf(store).tag;
			expect(all.map(({ type, ruleId }) => [type, ruleId])).toEqual([
				['pattern', 'tag-letters'],
				['pattern', 'tag-short'],
				['minLength', undefined],
			]);
			expect(all[0]).toEqual({
				type: 'pattern',
				source: 'validation',
				ruleId: 'tag-letters',
				params: { pattern: '^[a-z]+$' },
				message: 'Letters only',
			});
			expect(all[2].params).toEqual({ minLength: 8 });
			expect(all[2].message).toBeUndefined();
			expect(Object.isFrozen(all[2].params)).toBe(true);
		},
	},
	{
		rule: 'issue identity',
		name: 'rules are listed in authored order whatever order their checks finish in, and unchanged issues keep their objects',
		async run(createStore) {
			const { options, gate } = fixture();
			const store = createStore({
				...options,
				elements: [
					element({
						$type: 'input',
						name: 'slug',
						rules: [{ type: 'gate' }, { type: 'minLength', value: 5, message: 'Too short' }],
					}),
				],
				defaults: { slug: 'ab' },
			});
			gate.hold('ab');
			const run = store.validate();
			await vi.waitFor(() => expect(gate.pending('ab')).toBe(1));
			gate.settle('ab', false);
			expect(await run).toBe(false);
			const first = errorsOf(store).slug;
			expect(first.all.map(({ type }) => type)).toEqual(['gate', 'minLength']);
			await store.validate();
			expect(errorsOf(store).slug).toBe(first);
		},
	},
	{
		rule: 'validator failures',
		name: 'a rule that throws is no field error: validate and checkValidity reject naming it, an automatic check records it, the others still report',
		async run(createStore) {
			const options = custom(
				[
					{
						$type: 'input',
						name: 'secret',
						rules: [
							{ type: 'required', id: 'secret-required' },
							{ type: 'boom', id: 'secret-boom' },
						],
					},
				],
				{ secret: '' },
				{ validationMode: 'onChange' },
			);
			const store = createStore(options);
			const rejected: unknown = await store.validate().then(
				() => undefined,
				(error: unknown) => error,
			);
			expect(rejected).toMatchObject({
				name: 'FormValidationFailure',
				path: 'secret',
				ruleType: 'boom',
				ruleId: 'secret-boom',
			});
			const check: unknown = await store.checkValidity().then(
				() => undefined,
				(error: unknown) => error,
			);
			expect(check).toMatchObject({ path: 'secret', ruleType: 'boom' });
			expect(store.getSnapshot().isValidating).toBe(false);

			const automatic = createStore(options);
			automatic.setValue('secret', 'x');
			automatic.setValue('secret', '');
			await vi.waitFor(() => expect(automatic.getSnapshot().validationFailures.secret).toHaveLength(1));
			expect(automatic.getSnapshot().validationFailures.secret).toEqual([
				{ path: 'secret', ruleType: 'boom', ruleId: 'secret-boom', reason: 'error' },
			]);
			expect(Object.isFrozen(automatic.getSnapshot().validationFailures.secret[0])).toBe(true);
			expect(errorsOf(automatic).secret?.all).toEqual([
				{ type: 'required', source: 'validation', ruleId: 'secret-required' },
			]);
			expect(automatic.getSnapshot().isValid).toBe(false);
		},
	},
	{
		rule: 'warnings',
		name: 'a rule with severity warning reports advice that never blocks, with the shape and timing of an error',
		async run(createStore) {
			const store = createStore(
				custom(
					[
						{
							$type: 'input',
							name: 'password',
							rules: [
								{
									type: 'minLength',
									value: 8,
									severity: 'warning',
									id: 'password-strength',
									message: 'Weak',
								},
								{ type: 'minLength', value: 3, message: 'Too short' },
							],
						},
					],
					{ password: 'abcd' },
					{ validationMode: 'onChange' },
				),
			);
			store.setValue('password', 'abcde');
			await vi.waitFor(() => expect(store.getSnapshot().warnings.password).toBeDefined());
			expect(store.getSnapshot().warnings.password).toEqual({
				type: 'minLength',
				source: 'validation',
				ruleId: 'password-strength',
				params: { minLength: 8 },
				message: 'Weak',
				all: [
					{
						type: 'minLength',
						source: 'validation',
						ruleId: 'password-strength',
						params: { minLength: 8 },
						message: 'Weak',
					},
				],
			});
			expect(errorsOf(store)).toEqual({});
			expect(store.getSnapshot().isValid).toBe(true);
			expect(await store.validate()).toBe(true);
			expect(await store.checkValidity()).toBe(true);
			const field = store.getFieldState('password');
			expect(field).toMatchObject({ invalid: false, error: undefined });
			expect(selectWarning(store.getSnapshot(), 'password')).toBe(field.warning);
			store.setValue('password', 'abcdefgh');
			await vi.waitFor(() => expect(store.getSnapshot().warnings).toEqual({}));
			store.setValue('password', 'a');
			await vi.waitFor(() => expect(errorsOf(store).password?.message).toBe('Too short'));
			expect(store.getSnapshot().warnings.password?.message).toBe('Weak');
			expect(await store.validate()).toBe(false);
		},
	},
	{
		rule: 'warnings',
		name: 'warnings of a path that takes no part are not shown',
		async run(createStore) {
			const store = createStore(
				custom(
					[
						{ $type: 'input', name: 'kind' },
						{
							$type: 'input',
							name: 'company',
							rules: [{ type: 'required', severity: 'warning' }],
							constraints: [{ field: 'kind', action: 'show', operator: 'equals', value: 'business' }],
						},
					],
					{ kind: 'business', company: '' },
				),
			);
			expect(await store.validate()).toBe(true);
			expect(store.getSnapshot().warnings.company?.type).toBe('required');
			store.setValue('kind', 'person');
			expect(store.getSnapshot().warnings).toEqual({});
		},
	},
	{
		rule: 'issue identity',
		name: 'an async rule reports the endpoint text on its own channel, never library text, and an outage is a failure to run and is not cached',
		async run(createStore) {
			let reply: () => Response = () => new Response(JSON.stringify({ valid: false }));
			const fetchSpy = vi.fn(async () => reply());
			vi.stubGlobal('fetch', fetchSpy);
			try {
				const options = custom(
					[
						{
							$type: 'input',
							name: 'handle',
							rules: [
								{
									type: 'async',
									id: 'handle-free',
									url: '/check',
									headers: { Authorization: 'secret' },
								},
							],
						},
					],
					{ handle: 'ada' },
				);
				const store = createStore(options);
				expect(await store.validate()).toBe(false);
				expect(errorsOf(store).handle.all).toEqual([
					{ type: 'async', source: 'validation', ruleId: 'handle-free' },
				]);

				reply = () => new Response(JSON.stringify({ valid: false, message: 'Handle is taken' }));
				store.setValue('handle', 'ada2');
				expect(await store.validate()).toBe(false);
				expect(errorsOf(store).handle.message).toBe('Handle is taken');
				expect(JSON.stringify(store.getSnapshot())).not.toMatch(/Invalid input|secret|\/check/);

				reply = () => new Response('no', { status: 503 });
				store.setValue('handle', 'ada3');
				const down: unknown = await store.validate().then(
					() => undefined,
					(error: unknown) => error,
				);
				expect(down).toMatchObject({ name: 'FormValidationFailure', path: 'handle', ruleType: 'async' });
				expect((down as { cause: Error }).cause.name).toBe('ValidationUnavailable');
				const calls = fetchSpy.mock.calls.length;
				reply = () => new Response(JSON.stringify({ valid: true }));
				expect(await store.validate()).toBe(true);
				expect(fetchSpy.mock.calls.length).toBe(calls + 1);

				fetchSpy.mockImplementation(async () => {
					throw new Error('offline');
				});
				const offline: unknown = await createStore({ ...options, defaults: { handle: 'zed' } })
					.validate()
					.then(
						() => undefined,
						(error: unknown) => error,
					);
				expect((offline as { cause: Error }).cause.name).toBe('ValidationUnavailable');
			} finally {
				vi.unstubAllGlobals();
			}
		},
	},
	{
		rule: 'submission-bound validation',
		name: 'the token says how the last validation ended: passed, invalid, or overtaken',
		async run(createStore) {
			const { options, gate } = fixture();
			const store = createStore(options);
			const submission = store.beginSubmission();
			expect(submission.outcome).toBeUndefined();
			expect(await store.validate(undefined, { submission })).toBe(true);
			expect(submission.outcome).toBe('passed');

			store.setValue('name', '');
			expect(await store.validate(undefined, { submission })).toBe(false);
			expect(submission.outcome).toBe('invalid');

			store.setValue('name', 'Ada');
			gate.hold('one');
			const run = store.validate(['invites.0.code'], { submission });
			await vi.waitFor(() => expect(gate.pending('one')).toBe(1));
			expect(submission.outcome).toBeUndefined();
			store.fieldArray('invites').remove(0);
			gate.settle('one', true);
			expect(await run).toBe(false);
			expect(submission.outcome).toBe('overtaken');

			const reset = store.beginSubmission();
			gate.hold('free');
			store.setValue('slug', 'free');
			const second = store.validate(undefined, { submission: reset });
			await vi.waitFor(() => expect(gate.pending('free')).toBe(1));
			store.reset();
			gate.settle('free', true);
			expect(await second).toBe(false);
			expect(reset.outcome).toBe('overtaken');
		},
	},
	{
		rule: 'paths of writes',
		name: 'a reserved path in a native map rejects the call, and every reserved segment is named',
		async run(createStore) {
			const store = createStore(fixture().options);
			const call = () => store.validate(undefined, { native: { __x: { type: 'valueMissing' } } });
			let pending: Promise<boolean> | undefined;
			expect(() => {
				pending = call();
			}).not.toThrow();
			await expect(pending).rejects.toThrow(/reserved/);
			await expect(store.checkValidity(undefined, { native: { 'a.constructor': null } })).rejects.toThrow(
				/'constructor'/,
			);
			expect(() => store.setValue('prototype.x', 1)).toThrow(/__.*constructor.*prototype/s);
		},
	},
	{
		rule: 'native facts',
		name: 'a fact reported while the check of a write runs is not lost: the rule error and the native one both appear',
		async run(createStore) {
			const store = createStore(fixture({ validationMode: 'onChange' }).options);
			store.setValue('nickname', '');
			expect(store.getSnapshot().validating.nickname).toBe(true);
			store.reportNative('nickname', { type: 'valueMissing' });
			await vi.waitFor(() =>
				expect(errorsOf(store).nickname?.all.map(({ source }) => source)).toEqual(['validation', 'native']),
			);
			expect(store.getSnapshot().isValidating).toBe(false);

			const touched = createStore(fixture({ validationMode: 'onTouched' }).options);
			touched.blur('name');
			touched.setValue('name', '');
			touched.reportNative('name', { type: 'valueMissing' });
			await vi.waitFor(() =>
				expect(errorsOf(touched).name?.all.map(({ source }) => source)).toEqual(['validation', 'native']),
			);
		},
	},
	{
		rule: 'submission-bound validation',
		name: 'a superseded token ends overtaken whatever it ended before, and validating no paths passes and captures the values',
		async run(createStore) {
			const store = createStore(fixture().options);
			const first = store.beginSubmission();
			expect(await store.validate(undefined, { submission: first })).toBe(true);
			expect(first.outcome).toBe('passed');
			store.beginSubmission();
			expect(await store.validate(undefined, { submission: first })).toBe(true);
			expect(first.outcome).toBe('overtaken');

			const empty = store.beginSubmission();
			store.setValue('name', 'Grace');
			expect(await store.validate([], { submission: empty })).toBe(true);
			expect(empty.outcome).toBe('passed');
			expect(empty.values.name).toBe('Grace');
		},
	},
	{
		rule: 'validator failures',
		name: 'a snapshot says why a rule did not run: the service was unavailable, or the rule threw',
		async run(createStore) {
			vi.stubGlobal(
				'fetch',
				vi.fn(async () => new Response('no', { status: 500 })),
			);
			try {
				const store = createStore(
					custom(
						[
							{
								$type: 'input',
								name: 'handle',
								rules: [{ type: 'async', url: '/check', disableCache: true }],
							},
							{ $type: 'input', name: 'secret', rules: [{ type: 'boom' }] },
						],
						{ handle: '', secret: '' },
						{ validationMode: 'onChange' },
					),
				);
				store.setValue('handle', 'a');
				store.setValue('secret', 'x');
				await vi.waitFor(() =>
					expect(store.getSnapshot().validationFailures).toEqual({
						handle: [{ path: 'handle', ruleType: 'async', reason: 'unavailable' }],
						secret: [{ path: 'secret', ruleType: 'boom', reason: 'error' }],
					}),
				);
			} finally {
				vi.unstubAllGlobals();
			}
		},
	},
	{
		rule: 'atomic blur',
		name: 'blur writes the value and marks the field touched as one command with one notification',
		async run(createStore) {
			const store = createStore(fixture({ validationMode: 'onBlur' }).options);
			const seen: Array<{ value: unknown; touched: boolean }> = [];
			store.subscribe(() =>
				seen.push({
					value: store.getSnapshot().values.name,
					touched: store.getSnapshot().touched.name === true,
				}),
			);
			store.blur('name', { value: '', native: { type: 'valueMissing' } });
			expect(seen[0]).toEqual({ value: '', touched: true });
			expect(seen.every(({ touched }) => touched)).toBe(true);
			await vi.waitFor(() =>
				expect(errorsOf(store).name?.all.map(({ source }) => source)).toEqual(['validation', 'native']),
			);
			expect(store.getSnapshot().dirty.name).toBe(true);

			const quiet = createStore(fixture().options);
			const listener = vi.fn();
			quiet.subscribe(listener);
			quiet.blur('name', { value: 'Grace' });
			expect(listener).toHaveBeenCalledTimes(1);
			quiet.blur('name', { value: undefined });
			expect(quiet.getValue('name')).toBeUndefined();
			quiet.blur('nickname');
			expect(quiet.getValue('nickname')).toBe('ada');
		},
	},
	{
		rule: 'paths of writes',
		name: 'setValue and blur refuse a row the array does not have, and a reserved segment, instead of leaving holes',
		run(createStore) {
			const store = createStore(fixture().options);
			const before = store.getSnapshot();
			expect(() => store.setValue('contacts.3.email', 'x')).toThrow(
				/'contacts.3.email' names row '3' of 'contacts'/,
			);
			expect(() => store.setValue('contacts.-1.email', 'x')).toThrow(/names row '-1'/);
			expect(() => store.blur('contacts.5.email')).toThrow(/names row '5'/);
			expect(() => store.setValue('name.3.x', 'x')).toThrow(/names row '3' of 'name'/);
			expect(() => store.setValue('name.03.x', 'x')).toThrow(/names row '03' of 'name'/);
			expect(() => store.blur('contacts.5.email', { value: 'x' })).toThrow(/names row '5'/);
			expect(() => store.setValue('__secret', 1)).toThrow(/reserved segment/);
			expect(store.getSnapshot()).toBe(before);
			store.fieldArray('contacts').append({ email: 'd@example.com' });
			store.setValue('contacts.3.email', 'e@example.com');
			expect(store.getSnapshot().rowIds.contacts).toHaveLength(4);
			expect(store.getSnapshot().rowIds.contacts.every((id) => typeof id === 'string')).toBe(true);
		},
	},
	{
		rule: 'validation mode timing',
		name: 'onTouched validates on the first blur and on every change after it',
		async run(createStore) {
			const store = createStore(fixture({ validationMode: 'onTouched', defaults: { name: '' } }).options);
			const watch = watchValidation(store);
			store.setValue('name', '');
			store.setValue('name', 'x');
			store.setValue('name', '');
			await settle();
			expect(watch.started).toBe(false);
			store.blur('name');
			await vi.waitFor(() => expect(errorsOf(store).name?.type).toBe('required'));
			store.setValue('name', 'Ada');
			await vi.waitFor(() => expect(errorsOf(store).name).toBeUndefined());
			store.setValue('name', '');
			await vi.waitFor(() => expect(errorsOf(store).name?.type).toBe('required'));
		},
	},
	{
		rule: 'issue identity',
		name: 'a registration declares the params of its rule: native names, and nothing of the configuration of async or relate rules',
		async run(createStore) {
			const store = createStore(
				custom(
					[
						{
							$type: 'input',
							name: 'tag',
							rules: [
								{ type: 'maxLength', value: 2 },
								{
									type: 'relate',
									fields: ['other'],
									assert: 'allEqual',
									includeSelf: true,
									id: 'same',
								},
							],
						},
						{ $type: 'input', name: 'other' },
						{
							$type: 'input',
							name: 'count',
							rules: [
								{ type: 'min', value: 5 },
								{ type: 'max', value: 1 },
							],
						},
						{
							$type: 'arrayElements',
							name: 'rows',
							rules: [{ type: 'minItems', value: 2 }],
							elements: [{ $type: 'input', name: 'x' }],
						},
					],
					{ tag: 'abc', other: 'z', count: 3, rows: [{ x: '' }] },
				),
			);
			expect(await store.validate()).toBe(false);
			const errors = errorsOf(store);
			expect(errors.tag.all).toEqual([
				{ type: 'maxLength', source: 'validation', params: { maxLength: 2 } },
				{ type: 'relate', source: 'validation', ruleId: 'same', params: { assert: 'allEqual' } },
			]);
			expect(errors.count.all.map(({ params }) => params)).toEqual([{ min: 5 }, { max: 1 }]);
			expect(errors.rows.params).toEqual({ minItems: 2 });
			expect(JSON.stringify(errors)).not.toMatch(/Too (small|big)|Invalid input/);
		},
	},
];

/** Every rule of the contract, for a test that checks a deliberately broken store fails the rule it breaks. */
export const formStateContainerCases: readonly FormStateContainerCase[] = cases;

/**
 * Registers the internal form store contract as vitest tests against the store `createStore` builds.
 *
 * @remarks
 * Call it from a test file, like `rendererConformance`. A fresh store is built for each test.
 */
export function formStateContainerConformance(createStore: FormStateContainerFactory): void {
	describe('form state container conformance', () => {
		for (const rule of new Set(cases.map((entry) => entry.rule))) {
			describe(rule, () => {
				for (const entry of cases.filter((candidate) => candidate.rule === rule)) {
					test(entry.name, () => entry.run(createStore));
				}
			});
		}
	});
}

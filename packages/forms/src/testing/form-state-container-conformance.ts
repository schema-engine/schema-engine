import {
	assertCallCount,
	assertDefined,
	assertDoesNotThrow,
	assertEqual,
	assertLength,
	assertMatches,
	assertNoProperty,
	assertNotIncludes,
	assertNotMatches,
	assertNotSame,
	assertSame,
	assertThrows,
	assertUndefined,
	createSpy,
	spyOn,
	stubGlobal,
	waitFor,
} from '@/testing/assert.js';
import * as z from 'zod/mini';
import { markNormalizedElementConfig } from '@/lib/normalized-form-config.js';
import type { ElementConfig } from '@/schemas/field-config.js';
import type { ValidationElementTree } from '@/engine/value-validation.js';
import { createDefaultValidationRegistry, type ValidationRegistry } from '@/schemas/validation/validation-registry.js';
import { logger } from '@/lib/logger.js';
import { toFieldArrayValue } from '@/state-container/field-array.js';
import { toHydration } from '@/state-container/hydration.js';
import { selectFieldState, selectValue } from '@/state-container/selectors.js';
import {
	FORM_ROOT,
	type FormStateContainer,
	type FormStateContainerFactory,
	type FormStateContainerOptions,
	type FormStateErrorsInput,
	type FormStateHydration,
	type FormSubmitResult,
} from '@/state-container/types.js';

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

/** The timing a normalized form config always carries, for a container built without a config. */
export const defaultModes = { validationMode: 'onSubmit', reValidateMode: 'onChange' } as const;

/** What a container under test is built from, in the flat shape tests write; {@link containerOptions} turns it into the options of a container. */
export interface ContainerSetup {
	readonly registry: ValidationRegistry;
	readonly elements: ValidationElementTree;
	readonly validationMode?: FormStateContainerOptions['config']['validationMode'];
	readonly reValidateMode?: FormStateContainerOptions['config']['reValidateMode'];
	readonly payload?: Readonly<Record<string, unknown>>;
	readonly defaults?: Record<string, unknown>;
	readonly snapshot?: FormStateHydration;
}

/** The options of a container over `elements`, with the config a normalized form would give it. */
export function containerOptions(setup: ContainerSetup): FormStateContainerOptions {
	const { registry, elements, defaults, snapshot, payload } = setup;
	return {
		config: {
			steps: [{ elements }],
			validationMode: setup.validationMode ?? defaultModes.validationMode,
			reValidateMode: setup.reValidateMode ?? defaultModes.reValidateMode,
			...(payload === undefined ? {} : { payload }),
		},
		registry,
		...(defaults === undefined ? {} : { defaults }),
		...(snapshot === undefined ? {} : { snapshot }),
	};
}

interface Fixture {
	readonly options: FormStateContainerOptions;
	readonly gate: ReturnType<typeof createGate>;
}

function fixture(overrides: Partial<ContainerSetup> = {}): Fixture {
	const gate = createGate();
	const registry = createDefaultValidationRegistry([
		{
			$type: 'gate',
			schema: z.object({ $type: z.literal('gate') }),
			metadata: { name: 'Gate' },
			category: 'generic',
			handler: () => z.any().check(z.refine((value: unknown) => gate.check(value), 'Value is taken')),
		},
	]);
	return {
		gate,
		options: containerOptions({
			registry,
			elements: [
				element({ $type: 'input', name: 'name', rules: [{ $type: 'required', message: 'Name is required' }] }),
				element({
					$type: 'input',
					name: 'nickname',
					rules: [{ $type: 'required', message: 'Nickname is required' }],
				}),
				element({ $type: 'input', name: 'slug', rules: [{ $type: 'gate' }] }),
				element({
					$type: 'input',
					name: 'code',
					rules: [
						{ $type: 'minLength', value: 5, message: 'Too short' },
						{ $type: 'pattern', value: '^\\d+$', message: 'Digits only' },
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
								rules: [{ $type: 'required', message: 'Email is required' }],
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
									{ $type: 'input', name: 'code', rules: [{ $type: 'gate' }] },
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
						name: 'tags',
						elements: [{ $type: 'input', name: 'tag' }],
					},
					'array',
				),
				element(
					{
						$type: 'arrayElements',
						name: 'invites',
						rules: [{ $type: 'minItems', value: 2, message: 'Add two invites' }],
						elements: [
							{ $type: 'input', name: 'code', rules: [{ $type: 'gate' }] },
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
		}),
	};
}

const containerKinds: Record<string, 'array' | 'object'> = { arrayElements: 'array', fieldset: 'object' };

/** A container over `elements` with the default rules and a rule, `boom`, that throws when it runs. */
function custom(
	configs: ReadonlyArray<Record<string, unknown>>,
	defaults: Record<string, unknown>,
	overrides: Partial<ContainerSetup> = {},
): FormStateContainerOptions {
	const registry = createDefaultValidationRegistry([
		{
			$type: 'boom',
			schema: z.object({ $type: z.literal('boom') }),
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
	return containerOptions({
		registry,
		elements: configs.map((config) => element(config, containerKinds[String(config.$type)])),
		defaults,
		...overrides,
	});
}

/**
 * A form of three steps: `hasCompany` decides the company step, whose `wantsInvoice` decides the payment
 * step's `vat`, which is required.
 */
const stepsForm = (defaults: Record<string, unknown>): FormStateContainerOptions => {
	const { config, ...rest } = custom([], defaults);
	const input = (name: string, extra: Record<string, unknown> = {}) => element({ $type: 'input', name, ...extra });
	return {
		...rest,
		config: {
			...config,
			steps: [
				{ id: 'contact', elements: [input('hasCompany')] },
				{
					id: 'company',
					constraints: [{ field: 'hasCompany', operator: 'equals', value: true, $type: 'show' }],
					elements: [input('wantsInvoice'), input('company', { rules: [{ $type: 'required' }] })],
				},
				{
					id: 'payment',
					elements: [
						input('vat', {
							rules: [{ $type: 'required' }],
							constraints: [{ field: 'wantsInvoice', operator: 'equals', value: 'yes', $type: 'show' }],
						}),
					],
				},
			],
		},
	};
};

/** Two fields in a business form: `company` is required and shown only for a business. */
const businessForm = (defaults: Record<string, unknown> = { kind: 'person', company: '' }) =>
	custom(
		[
			{ $type: 'input', name: 'kind' },
			{
				$type: 'input',
				name: 'company',
				rules: [{ $type: 'required', id: 'company-required', message: 'Company is required' }],
				constraints: [{ field: 'kind', $type: 'show', operator: 'equals', value: 'business' }],
			},
		],
		defaults,
	);

/** Two fields whose second must equal the first. */
const passwordForm = () =>
	custom(
		[
			{ $type: 'input', name: 'password' },
			{ $type: 'input', name: 'confirm', rules: [{ $type: 'relate', fields: ['password'], assert: 'allEqual' }] },
		],
		{ password: 'a', confirm: 'a' },
	);

const isValidating = (store: FormStateContainer): boolean => Object.keys(store.getSnapshot().validating).length > 0;

/**
 * Records whether a validation the store started was ever running, as a subscriber sees it.
 *
 * @remarks
 * A check that nothing validated cannot pass vacuously on a short wait: every validation the store
 * starts is observable as a path in `validating` while it runs.
 */
export function watchValidation(store: FormStateContainer): { readonly started: boolean } {
	const watch = { started: false };
	store.subscribe(() => {
		if (isValidating(store)) watch.started = true;
	});
	return watch;
}

/** The paths of a flat map of marks, in order. */
const marked = (marks: object): string[] => Object.keys(marks).toSorted();

const serverIssue = (message: string) => ({ type: 'custom', message });
const fieldState = (store: FormStateContainer, path: string) => selectFieldState(store.getSnapshot(), path);

/** The result of a submission, narrowed to a pass. */
function passedOf(result: FormSubmitResult) {
	if (result.outcome !== 'passed') throw new Error(`The submission did not pass: ${result.outcome}.`);
	return result;
}

/** A submission that passed, as a host starts one before it sends the values to a server. */
const passedSubmission = async (store: FormStateContainer) => passedOf(await store.submit());

/** The server's answer to a submission that passed. */
const serverAnswer = async (store: FormStateContainer, errors: FormStateErrorsInput) =>
	(await passedSubmission(store)).setServerErrors(errors);
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
			assertSame(store.getSnapshot(), first);
			const listener = createSpy();
			const unsubscribe = store.subscribe(listener);
			store.setValue('name', 'Grace');
			assertCallCount(listener, 1);
			const second = store.getSnapshot();
			assertNotSame(second, first);
			assertSame(store.getSnapshot(), second);
			store.setValue('name', 'Grace');
			assertCallCount(listener, 1);
			assertSame(store.getSnapshot(), second);
			unsubscribe();
			store.setValue('name', 'Hedy');
			assertCallCount(listener, 1);
		},
	},
	{
		rule: 'reset generation',
		name: 'the snapshot counts resets in generation: it starts at the server snapshot, goes up by one on every reset and on nothing else',
		async run(createStore) {
			const store = createStore(fixture().options);
			const start = store.getSnapshot().generation;
			assertSame(store.getServerSnapshot().generation, start);
			store.setValue('name', 'Grace');
			store.blur('name');
			await store.validate();
			await store.submit();
			assertSame(store.getSnapshot().generation, start);
			store.reset();
			assertSame(store.getSnapshot().generation, start + 1);
			store.reset({ name: 'Hedy' });
			assertSame(store.getSnapshot().generation, start + 2);
			assertSame(store.getServerSnapshot().generation, start);
		},
	},
	{
		rule: 'reset generation',
		name: 'a reset of a pristine form still notifies, since the generation changed',
		run(createStore) {
			const store = createStore(fixture().options);
			const listener = createSpy();
			store.subscribe(listener);
			const before = store.getSnapshot();
			store.reset();
			assertCallCount(listener, 1);
			assertNotSame(store.getSnapshot(), before);
			assertEqual(store.getSnapshot().values, before.values);
		},
	},
	{
		rule: 'snapshot stability',
		name: 'keeps one server snapshot for hydration, whatever happens to the store',
		run(createStore) {
			const store = createStore(fixture().options);
			const server = store.getServerSnapshot();
			assertSame(store.getServerSnapshot(), server);
			assertSame(server.values.name, 'Ada');
			store.setValue('name', 'Grace');
			store.blur('name');
			assertSame(store.getServerSnapshot(), server);
			assertSame(server.values.name, 'Ada');
			assertSame(store.getSnapshot().values.name, 'Grace');
		},
	},
	{
		rule: 'immutability',
		name: 'freezes snapshots and does not alias the values it was given',
		async run(createStore) {
			const defaults = {
				name: 'Ada',
				nickname: 'ada',
				slug: 'free',
				code: '12345',
				address: { street: '1 Main', country: 'IT' },
				contacts: [{ email: 'a@example.com' }],
				invites: [{ code: 'one' }, { code: 'two' }],
			};
			const store = createStore(fixture({ defaults: defaults }).options);
			const snapshot = store.getSnapshot();
			assertThrows(() => {
				(snapshot.values as Record<string, unknown>).name = 'Eve';
			}, TypeError);
			assertThrows(() => {
				(snapshot.values.address as Record<string, unknown>).street = 'Eve';
			}, TypeError);
			assertThrows(() => {
				(snapshot.errors as Record<string, unknown>).name = serverIssue('x');
			}, TypeError);
			assertThrows(() => {
				(snapshot.touched as Record<string, unknown>).name = true;
			}, TypeError);
			assertThrows(() => {
				(snapshot.dirty as Record<string, unknown>).name = true;
			}, TypeError);
			assertThrows(() => {
				(snapshot.rowIds as Record<string, unknown>).contacts = [];
			}, TypeError);
			assertThrows(() => {
				(snapshot.rowIds.contacts as string[]).push('x');
			}, TypeError);

			defaults.address.street = 'changed after create';
			assertSame((store.getSnapshot().values.address as { street: string }).street, '1 Main');

			const branch = { street: '2 Side', country: 'FR' };
			store.setValue('address', branch);
			branch.street = 'changed after setValue';
			assertSame((store.getSnapshot().values.address as { street: string }).street, '2 Side');

			const given = { name: serverIssue('Taken') };
			await serverAnswer(store, given);
			given.name.message = 'changed after the answer';
			assertSame(errorsOf(store).name?.message, 'Taken');
			assertSame(Object.getPrototypeOf(store.getSnapshot().values), Object.prototype);
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
			assertSame(after.values.address, before.values.address);
			assertSame(after.values.contacts, before.values.contacts);
			assertSame(after.errors, before.errors);
			assertSame(after.touched, before.touched);
			assertSame(after.rowIds, before.rowIds);

			store.setValue('contacts.1.email', 'new@example.com');
			const rows = store.getSnapshot().values.contacts as unknown[];
			const earlier = after.values.contacts as unknown[];
			assertNotSame(rows, earlier);
			assertSame(rows[0], earlier[0]);
			assertNotSame(rows[1], earlier[1]);
			assertSame(rows[2], earlier[2]);

			const valuesBeforeBlur = store.getSnapshot().values;
			store.blur('name');
			assertSame(store.getSnapshot().values, valuesBeforeBlur);
			assertSame(store.getSnapshot().values.contacts, rows);
		},
	},
	{
		rule: 'field state per exact path',
		name: 'keeps errors, touched and dirty as flat maps by exact path, stable while unrelated state changes',
		async run(createStore) {
			const store = createStore(fixture().options);
			await serverAnswer(store, { 'contacts.1.email': serverIssue('one'), nickname: serverIssue('nick') });
			store.blur('contacts.1.email');
			store.setValue('address.street', '2 Side');
			const { errors, touched, dirty } = store.getSnapshot();
			assertEqual(Object.keys(errors).toSorted(), ['contacts.1.email', 'nickname']);
			assertMatches(errors.nickname, { message: 'nick', source: 'server' });
			assertEqual(touched, { 'contacts.1.email': true });
			assertEqual(dirty, { 'address.street': true });
			assertEqual(Object.keys(store.getSnapshot()).toSorted(), [
				'dirty',
				'errors',
				'generation',
				'isValid',
				'participation',
				'rowIds',
				'touched',
				'validating',
				'values',
				'warnings',
			]);

			store.setValue('name', 'Grace');
			const after = store.getSnapshot();
			assertSame(after.errors, errors);
			assertSame(after.touched, touched);
			assertNotSame(after.dirty, dirty);
		},
	},
	{
		rule: 'field state per exact path',
		name: 'an error is never inherited: a container and a row inside it can both have one',
		async run(createStore) {
			const store = createStore(fixture().options);
			await serverAnswer(store, { contacts: serverIssue('too few'), 'contacts.0.email': serverIssue('row') });
			assertEqual(Object.keys(errorsOf(store)).toSorted(), ['contacts', 'contacts.0.email']);
			assertSame(fieldState(store, 'contacts').error?.message, 'too few');
			assertSame(fieldState(store, 'contacts.0.email').error?.message, 'row');
			assertUndefined(fieldState(store, 'contacts.1.email').error);
			assertSame(store.getSnapshot().isValid, false);
		},
	},
	{
		rule: 'field state per exact path',
		name: 'an error about the form is its own entry and is no field error',
		async run(createStore) {
			const store = createStore(fixture().options);
			await serverAnswer(store, { [FORM_ROOT]: serverIssue('Try again later') });
			assertEqual(Object.keys(errorsOf(store)), [FORM_ROOT]);
			assertMatches(errorsOf(store)[FORM_ROOT], { message: 'Try again later' });
			assertUndefined(fieldState(store, 'name').error);
			assertSame(fieldState(store, 'contacts.0.email').invalid, false);
			assertSame(store.getSnapshot().isValid, false);
			assertEqual(await store.validate(['name']), { outcome: 'passed' });
			assertEqual(await store.validate(), { outcome: 'invalid' });
			store.setValue('name', 'Grace');
			assertEqual(errorsOf(store), {});
			assertSame(store.getSnapshot().isValid, true);
		},
	},
	{
		rule: 'field state per exact path',
		name: 'editing a path drops the errors a host set there, below it and around it, and keeps the others',
		async run(createStore) {
			const store = createStore(fixture().options);
			await serverAnswer(store, {
				[FORM_ROOT]: serverIssue('form'),
				contacts: serverIssue('array'),
				'contacts.0': serverIssue('row'),
				'contacts.0.email': serverIssue('field'),
				'contacts.1.email': serverIssue('sibling'),
				nickname: serverIssue('other'),
			});
			store.setValue('contacts.0.email', 'new@example.com');
			assertEqual(Object.keys(errorsOf(store)).toSorted(), ['contacts.1.email', 'nickname']);
		},
	},
	{
		rule: 'field state per exact path',
		name: 'touched marks cover the fields below them, and dirty marks do not cover but report below',
		run(createStore) {
			const store = createStore(fixture().options);
			store.blur('address');
			assertSame(fieldState(store, 'address.street').isTouched, true);
			assertSame(fieldState(store, 'address').isTouched, true);
			assertSame(fieldState(store, 'name').isTouched, false);
			store.setValue('address.street', '2 Side');
			assertSame(fieldState(store, 'address').isDirty, true);
			assertSame(fieldState(store, 'address.country').isDirty, false);
		},
	},
	{
		rule: 'field state in the shape of the values',
		name: 'selectFieldState reports error, touched and dirty for a path',
		async run(createStore) {
			const store = createStore(fixture().options);
			assertEqual(fieldState(store, 'name'), {
				error: undefined,
				warning: undefined,
				invalid: false,
				isTouched: false,
				isDirty: false,
				isValidating: false,
				hidden: false,
				disabled: false,
				required: false,
			});
			store.setValue('name', 'Grace');
			store.blur('name');
			await serverAnswer(store, { name: serverIssue('no') });
			assertMatches(fieldState(store, 'name'), {
				error: { message: 'no' },
				invalid: true,
				isTouched: true,
				isDirty: true,
			});
			store.setValue('address.street', '2 Side');
			assertMatches(fieldState(store, 'address'), { isDirty: true, isTouched: false });
		},
	},
	{
		rule: 'snapshot stability',
		name: 'selectValue and selectFieldState read a snapshot by exact path and keep their reference while it holds',
		async run(createStore) {
			const store = createStore(fixture().options);
			const before = store.getSnapshot();
			assertSame(selectValue(before, 'address'), before.values.address);
			assertSame(selectValue(before, 'contacts.1.email'), 'b@example.com');
			await serverAnswer(store, { contacts: serverIssue('array') });
			store.setValue('name', 'Grace');
			const after = store.getSnapshot();
			assertSame(selectValue(after, 'address'), selectValue(before, 'address'));
			assertSame(selectFieldState(after, 'contacts').error?.message, 'array');
			assertUndefined(selectFieldState(after, 'contacts.0.email').error);
		},
	},
	{
		rule: 'snapshot stability',
		name: 'selectFieldState gives the same object for a snapshot and path, and a new one once its state changed',
		run(createStore) {
			const store = createStore(fixture().options);
			const before = store.getSnapshot();
			assertSame(selectFieldState(before, 'name'), selectFieldState(before, 'name'));
			assertSame(fieldState(store, 'name'), selectFieldState(before, 'name'));
			store.blur('name');
			const after = store.getSnapshot();
			assertNotSame(selectFieldState(after, 'name'), selectFieldState(before, 'name'));
			assertSame(selectFieldState(after, 'name').isTouched, true);
			assertSame(selectFieldState(before, 'name').isTouched, false);
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
			assertSame(store.getSnapshot().values.files, files);
			assertSame(store.getValue('files'), files);
			assertSame(Object.isFrozen(files), false);

			const listener = createSpy();
			store.subscribe(listener);
			store.setValue('files', files);
			assertCallCount(listener, 0);

			store.setValue('files', [file]);
			assertCallCount(listener, 1);
			assertNotSame(store.getSnapshot().values.files, files);
			assertSame((store.getSnapshot().values.files as File[])[0], file);
			assertSame(store.getSnapshot().dirty.files, true);

			store.setValue('profile', { avatar: [file] });
			assertSame((store.getSnapshot().values.profile as { avatar: File[] }).avatar[0], file);
		},
	},
	{
		rule: 'branch replacement',
		name: 'setValue replaces the whole branch rather than merging into it',
		run(createStore) {
			const store = createStore(fixture().options);
			store.setValue('address', { street: '9 Elm' });
			assertEqual(store.getSnapshot().values.address, { street: '9 Elm' });
			assertUndefined(store.getValue('address.country'));
			store.setValue('contacts', [{ email: 'only@example.com' }]);
			assertEqual(contacts(store), ['only@example.com']);
			assertLength(store.getSnapshot().rowIds.contacts, 1);
		},
	},
	{
		rule: 'branch replacement',
		name: 'a replacement with the same content changes nothing and keeps references',
		run(createStore) {
			const store = createStore(fixture().options);
			const before = store.getSnapshot();
			const listener = createSpy();
			store.subscribe(listener);
			store.setValue('address', { street: '1 Main', country: 'IT' });
			assertCallCount(listener, 0);
			assertSame(store.getSnapshot(), before);
			store.setValue('address', { street: '1 Main', country: 'FR' });
			const after = store.getSnapshot();
			assertSame(after.values.contacts, before.values.contacts);
		},
	},
	{
		rule: 'snapshot stability',
		name: 'notifies once per command even when the command starts a validation',
		run(createStore) {
			const change = createStore(fixture({ validationMode: 'onChange' }).options);
			const onChange = createSpy();
			change.subscribe(onChange);
			change.setValue('name', '');
			assertCallCount(onChange, 1);
			assertEqual(change.getSnapshot().validating, { name: true });
			change.fieldArray('contacts').swap(0, 1);
			assertCallCount(onChange, 2);

			const blur = createStore(fixture({ validationMode: 'onBlur' }).options);
			const onBlur = createSpy();
			blur.subscribe(onBlur);
			blur.blur('name');
			assertCallCount(onBlur, 1);
			assertEqual(blur.getSnapshot().validating, { name: true });
		},
	},
	{
		rule: 'validation mode timing',
		name: 'an empty list of paths validates nothing, and undefined validates the form',
		async run(createStore) {
			const store = createStore(fixture({ defaults: { name: '', nickname: '' } }).options);
			const watch = watchValidation(store);
			assertEqual(await store.validate([]), { outcome: 'passed' });
			assertSame(watch.started, false);
			assertSame(await store.checkValidity(), false);
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
			await waitFor(() => assertSame(errorsOf(store).invites?.message, 'Add two invites'));
			assertSame(gate.pending('x'), 0);
			assertUndefined(errorsOf(store)['invites.0.code']);
			assertSame(isValidating(store), false);
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
			assertSame(watch.started, false);
			assertEqual(errorsOf(store), {});
			assertEqual(await store.validate(), { outcome: 'invalid' });
			assertSame(errorsOf(store).name?.message, 'Name is required');
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
			assertSame(watch.started, false);
			assertEqual(errorsOf(store), {});
			store.setValue('name', 'Ada');
			store.setValue('name', '');
			await waitFor(() => assertSame(errorsOf(store).name?.message, 'Name is required'));
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
			assertSame(watch.started, false);
			assertEqual(errorsOf(store), {});
			store.blur('name');
			await waitFor(() => assertSame(errorsOf(store).name?.message, 'Name is required'));
		},
	},
	{
		rule: 'validation mode timing',
		name: 'with all both a change and a blur validate',
		async run(createStore) {
			const onChange = createStore(fixture({ validationMode: 'all' }).options);
			onChange.setValue('name', '');
			await waitFor(() => assertDefined(errorsOf(onChange).name));
			onChange.setValue('name', 'Ada');
			await waitFor(() => assertUndefined(errorsOf(onChange).name));

			const onBlur = createStore(fixture({ validationMode: 'all', defaults: { name: '' } }).options);
			assertEqual(errorsOf(onBlur), {});
			onBlur.blur('name');
			await waitFor(() => assertSame(errorsOf(onBlur).name?.message, 'Name is required'));
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
			await waitFor(() => assertSame(errorsOf(store).nickname?.message, 'Nickname is required'));
			assertUndefined(errorsOf(store).name);
		},
	},
	{
		rule: 're-validation after a failed check',
		name: 'after a failed validate the paths re-validate on change under reValidateMode onChange',
		async run(createStore) {
			const store = createStore(fixture({ validationMode: 'onSubmit', reValidateMode: 'onChange' }).options);
			store.setValue('name', '');
			assertEqual(await store.validate(), { outcome: 'invalid' });
			store.setValue('name', 'Ada');
			await waitFor(() => assertUndefined(errorsOf(store).name));
			store.setValue('name', '');
			await waitFor(() => assertSame(errorsOf(store).name?.message, 'Name is required'));
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
			assertSame(changeWatch.started, false);
			assertDefined(errorsOf(onBlur).name);
			onBlur.blur('name');
			await waitFor(() => assertUndefined(errorsOf(onBlur).name));

			const onSubmit = createStore(fixture({ validationMode: 'onSubmit', reValidateMode: 'onSubmit' }).options);
			onSubmit.setValue('name', '');
			await onSubmit.validate();
			const submitWatch = watchValidation(onSubmit);
			onSubmit.setValue('name', 'Ada');
			onSubmit.blur('name');
			await settle();
			assertSame(submitWatch.started, false);
			assertDefined(errorsOf(onSubmit).name);
		},
	},
	{
		rule: 're-validation after a failed check',
		name: 'a failed check of some paths does not turn on re-validation for the others',
		async run(createStore) {
			const store = createStore(fixture({ validationMode: 'onSubmit', reValidateMode: 'onChange' }).options);
			store.setValue('name', '');
			assertEqual(await store.validate(['name']), { outcome: 'invalid' });
			const watch = watchValidation(store);
			store.setValue('nickname', '');
			await settle();
			assertSame(watch.started, false);
			assertUndefined(errorsOf(store).nickname);
			store.setValue('name', 'Ada');
			await waitFor(() => assertUndefined(errorsOf(store).name));
		},
	},
	{
		rule: 're-validation after a failed check',
		name: 'a passing validate starts re-validation of the paths it checked, and no others, and reset ends it',
		async run(createStore) {
			const store = createStore(fixture({ validationMode: 'onSubmit', reValidateMode: 'onChange' }).options);
			assertEqual(await store.validate(['nickname']), { outcome: 'passed' });
			const other = watchValidation(store);
			store.setValue('name', '');
			await settle();
			assertSame(other.started, false);
			assertEqual(errorsOf(store), {});
			store.setValue('name', 'Ada');

			assertEqual(await store.validate(), { outcome: 'passed' });
			store.setValue('name', '');
			await waitFor(() => assertSame(errorsOf(store).name?.type, 'required'));

			assertEqual(await store.validate(), { outcome: 'invalid' });
			store.reset();
			const afterReset = watchValidation(store);
			store.setValue('name', '');
			await settle();
			assertSame(afterReset.started, false);
			assertEqual(errorsOf(store), {});
		},
	},
	{
		rule: 'silent validity check',
		name: 'checkValidity reports validity and changes nothing, not even for subscribers',
		async run(createStore) {
			const store = createStore(fixture().options);
			store.setValue('name', '');
			const before = store.getSnapshot();
			const listener = createSpy();
			store.subscribe(listener);
			assertSame(await store.checkValidity(), false);
			assertSame(store.getSnapshot(), before);
			assertCallCount(listener, 0);
			assertEqual(errorsOf(store), {});
		},
	},
	{
		rule: 'touched and dirty',
		name: 'touched is set by a blur, not by a change, and cleared by reset',
		run(createStore) {
			const store = createStore(fixture().options);
			store.setValue('name', 'Grace');
			assertEqual(store.getSnapshot().touched, {});
			store.blur('name');
			assertEqual(store.getSnapshot().touched, { name: true });
			const touched = store.getSnapshot().touched;
			store.blur('name');
			assertSame(store.getSnapshot().touched, touched);
			store.reset();
			assertEqual(store.getSnapshot().touched, {});
		},
	},
	{
		rule: 'touched and dirty',
		name: 'dirty follows the difference from the defaults, and appending a row does not make the rows before it dirty',
		run(createStore) {
			const store = createStore(fixture().options);
			assertEqual(store.getSnapshot().dirty, {});
			store.setValue('address.street', '2 Side');
			assertEqual(marked(store.getSnapshot().dirty), ['address.street']);
			store.setValue('address.street', '1 Main');
			assertEqual(store.getSnapshot().dirty, {});
			store.setValue('contacts.1.email', 'x@example.com');
			assertEqual(marked(store.getSnapshot().dirty), ['contacts.1.email']);
			store.setValue('contacts.1.email', 'b@example.com');
			store.fieldArray('contacts').append({ email: 'x@example.com' });
			assertEqual(marked(store.getSnapshot().dirty), ['contacts', 'contacts.3.email']);
			store.setValue('name', 'Grace');
			store.reset();
			assertEqual(store.getSnapshot().dirty, {});
		},
	},
	{
		rule: 'touched and dirty',
		name: 'reset without values restores the defaults and clears every source of state',
		async run(createStore) {
			const store = createStore(fixture({ validationMode: 'onSubmit' }).options);
			await serverAnswer(store, { nickname: serverIssue('no') });
			store.setValue('name', '');
			store.blur('name');
			assertEqual(await store.validate(), { outcome: 'invalid' });
			store.reset();
			const snapshot = store.getSnapshot();
			assertSame(snapshot.values.name, 'Ada');
			assertEqual(snapshot.errors, {});
			assertEqual(snapshot.touched, {});
			assertEqual(snapshot.dirty, {});
		},
	},
	{
		rule: 'touched and dirty',
		name: 'reset with values makes them the new defaults',
		run(createStore) {
			const store = createStore(fixture().options);
			store.setValue('name', 'Grace');
			store.reset({ name: 'Hedy' });
			assertEqual(store.getSnapshot().values, { name: 'Hedy' });
			assertEqual(store.getSnapshot().dirty, {});
			store.setValue('name', 'Ada');
			assertEqual(store.getSnapshot().dirty, { name: true });
			store.reset();
			assertSame(store.getValue('name'), 'Hedy');
		},
	},
	{
		rule: 'array reindexing',
		name: 'swap moves rows with their ids, errors and touched state in one update',
		async run(createStore) {
			const store = createStore(fixture().options);
			await serverAnswer(store, {
				'contacts.0.email': serverIssue('zero'),
				'contacts.1.email': serverIssue('one'),
			});
			store.blur('contacts.1.email');
			const [first, second, third] = ids(store);
			const listener = createSpy(() => {
				const snapshot = store.getSnapshot();
				assertEqual(snapshot.rowIds.contacts, [second, first, third]);
				assertEqual(contacts(store), ['b@example.com', 'a@example.com', 'c@example.com']);
				assertSame(snapshot.errors['contacts.0.email']?.message, 'one');
				assertSame(snapshot.errors['contacts.1.email']?.message, 'zero');
				assertEqual(marked(snapshot.touched), ['contacts.0.email']);
			});
			store.subscribe(listener);
			store.fieldArray('contacts').swap(0, 1);
			assertCallCount(listener, 1);
		},
	},
	{
		rule: 'array reindexing',
		name: 'move, prepend, insert and remove shift state to the rows it belongs to',
		async run(createStore) {
			const store = createStore(fixture().options);
			const array = store.fieldArray('contacts');
			const [first, second, third] = ids(store);
			await serverAnswer(store, { 'contacts.2.email': serverIssue('two') });
			store.blur('contacts.2.email');

			array.move(2, 0);
			assertEqual(ids(store), [third, first, second]);
			assertSame(errorsOf(store)['contacts.0.email']?.message, 'two');
			assertEqual(marked(store.getSnapshot().touched), ['contacts.0.email']);

			array.prepend({ email: 'new@example.com' });
			assertEqual(ids(store).slice(1), [third, first, second]);
			assertEqual(Object.keys(errorsOf(store)), ['contacts.1.email']);

			array.insert(1, { email: 'mid@example.com' });
			assertEqual(Object.keys(errorsOf(store)), ['contacts.2.email']);
			assertEqual(ids(store).slice(2), [third, first, second]);

			array.remove(0);
			assertEqual(Object.keys(errorsOf(store)), ['contacts.1.email']);
			assertEqual(marked(store.getSnapshot().touched), ['contacts.1.email']);

			array.remove(1);
			assertEqual(errorsOf(store), {});
			assertEqual(store.getSnapshot().touched, {});
			assertEqual(contacts(store), ['mid@example.com', 'a@example.com', 'b@example.com']);
			assertEqual(
				toFieldArrayValue(ids(store), array).fields.map(({ id }) => id),
				ids(store),
			);
		},
	},
	{
		rule: 'array reindexing',
		name: 'append keeps existing rows and ids, and an array value appends several rows',
		run(createStore) {
			const store = createStore(fixture().options);
			const before = ids(store);
			store.fieldArray('contacts').append([{ email: 'x@example.com' }, { email: 'y@example.com' }]);
			assertEqual(ids(store).slice(0, 3), before);
			assertLength(ids(store), 5);
			assertSame(new Set(ids(store)).size, 5);
			assertEqual(contacts(store).slice(3), ['x@example.com', 'y@example.com']);
		},
	},
	{
		rule: 'array reindexing',
		name: 'update and replace give the rows new ids and drop their state',
		async run(createStore) {
			const store = createStore(fixture().options);
			const array = store.fieldArray('contacts');
			const before = ids(store);
			await serverAnswer(store, {
				'contacts.0.email': serverIssue('zero'),
				'contacts.1.email': serverIssue('one'),
			});
			store.blur('contacts.0.email');
			array.update(1, { email: 'u@example.com' });
			assertSame(ids(store)[0], before[0]);
			assertNotSame(ids(store)[1], before[1]);
			assertSame(ids(store)[2], before[2]);
			assertEqual(Object.keys(errorsOf(store)), ['contacts.0.email']);
			assertEqual(marked(store.getSnapshot().touched), ['contacts.0.email']);

			array.replace([{ email: 'r@example.com' }]);
			assertLength(ids(store), 1);
			assertNotIncludes(before, ids(store)[0]);
			assertEqual(errorsOf(store), {});
			assertEqual(store.getSnapshot().touched, {});
		},
	},
	{
		rule: 'array reindexing',
		name: 'an operation naming a row that does not exist does nothing, and remove removes each row once',
		run(createStore) {
			const store = createStore(fixture().options);
			const array = store.fieldArray('contacts');
			const before = store.getSnapshot();
			const listener = createSpy();
			store.subscribe(listener);
			array.swap(0, 5);
			array.move(-1, 0);
			array.move(0, 3);
			array.update(3, { email: 'z@example.com' });
			array.insert(4, { email: 'z@example.com' });
			array.insert(1.5, { email: 'z@example.com' });
			array.remove(7);
			array.remove([]);
			assertCallCount(listener, 0);
			assertSame(store.getSnapshot(), before);

			array.insert(3, { email: 'end@example.com' });
			assertLength(contacts(store), 4);
			array.remove([0, 0, 9]);
			assertEqual(contacts(store), ['b@example.com', 'c@example.com', 'end@example.com']);
			array.remove();
			assertEqual(contacts(store), []);
			assertEqual(store.getSnapshot().rowIds.contacts, []);
		},
	},
	{
		rule: 'array reindexing',
		name: 'nested and scalar arrays carry their rows state, and shrinking drops it',
		async run(createStore) {
			const store = createStore(
				fixture({
					defaults: {
						name: 'Ada',
						nickname: 'ada',
						slug: 'free',
						code: '12345',
						contacts: [{ email: 'a@example.com' }],
						invites: [{ code: 'one' }, { code: 'two' }],
						groups: [
							{ title: 'a', members: [{ label: 'x' }, { label: 'y' }] },
							{ title: 'b', members: [{ label: 'z' }] },
						],
						tags: ['p', 'q', 'r'],
					},
				}).options,
			);
			await serverAnswer(store, {
				'groups.0.members.1.label': serverIssue('inner'),
				'tags.1': serverIssue('scalar'),
			});
			store.blur('groups.0.members.1.label');
			store.blur('tags.2');

			store.fieldArray('groups').swap(0, 1);
			assertEqual(Object.keys(errorsOf(store)).toSorted(), ['groups.1.members.1.label', 'tags.1']);
			assertEqual(marked(store.getSnapshot().touched).toSorted(), ['groups.1.members.1.label', 'tags.2']);

			store.fieldArray('groups.1.members').remove(0);
			assertEqual(Object.keys(errorsOf(store)).toSorted(), ['groups.1.members.0.label', 'tags.1']);

			store.fieldArray('tags').remove(0);
			assertEqual(Object.keys(errorsOf(store)).toSorted(), ['groups.1.members.0.label', 'tags.0']);
			assertEqual(marked(store.getSnapshot().touched).toSorted(), ['groups.1.members.0.label', 'tags.1']);

			store.setValue('groups', [{ title: 'only', members: [] }]);
			assertEqual(Object.keys(errorsOf(store)), ['tags.0']);
			assertEqual(marked(store.getSnapshot().touched), ['tags.1']);
			assertEqual(store.getSnapshot().rowIds['groups.0.members'], []);
		},
	},
	{
		rule: 'array reindexing',
		name: 'hydrates from the serialized snapshot of another container: its values and ids after row operations, and fresh ids for new rows',
		async run(createStore) {
			const server = createStore(fixture().options);
			server.fieldArray('contacts').remove(0);
			server.fieldArray('contacts').prepend({ email: 'first@example.com' });
			server.fieldArray('invites').swap(0, 1);
			server.setValue('name', 'Typed');
			const hydration: FormStateHydration = JSON.parse(JSON.stringify(toHydration(server.getSnapshot())));

			const client = createStore(fixture({ snapshot: hydration }).options);
			const was = server.getSnapshot();
			assertEqual(client.getSnapshot().values, was.values);
			assertEqual(client.getSnapshot().rowIds, was.rowIds);
			assertEqual(client.getSnapshot().dirty, was.dirty);
			assertEqual(client.getServerSnapshot().rowIds, was.rowIds);

			client.fieldArray('contacts').append({ email: 'new@example.com' });
			client.fieldArray('contacts').remove(0);
			const adopted = Object.values(was.rowIds).flat();
			const minted = ids(client).filter((id) => !adopted.includes(id));
			assertLength(minted, 1);
			assertEqual(ids(client).slice(0, 2), was.rowIds.contacts.slice(1));
			assertSame(new Set(ids(client)).size, ids(client).length);
		},
	},
	{
		rule: 'array reindexing',
		name: 'a branch written over rows drops the state of rows that no longer exist',
		async run(createStore) {
			const store = createStore(fixture().options);
			await serverAnswer(store, { 'contacts.2.email': serverIssue('two') });
			store.blur('contacts.2.email');
			store.setValue('contacts', [{ email: 'a@example.com' }]);
			assertEqual(errorsOf(store), {});
			assertEqual(store.getSnapshot().touched, {});

			const checked = createStore(fixture().options);
			checked.setValue('contacts.2.email', '');
			assertEqual(await checked.validate(['contacts.2.email']), { outcome: 'invalid' });
			checked.setValue('contacts', [{ email: 'a@example.com' }]);
			checked.fieldArray('contacts').append({ email: 'fresh@example.com' });
			checked.fieldArray('contacts').append({ email: '' });
			assertEqual(errorsOf(checked), {});
			const watch = watchValidation(checked);
			checked.setValue('contacts.2.email', 'changed@example.com');
			await settle();
			assertSame(watch.started, false);
		},
	},
	{
		rule: 'array reindexing',
		name: 'keeps row ids by position when a branch is replaced with the same number of rows',
		run(createStore) {
			const store = createStore(fixture().options);
			const before = ids(store);
			store.setValue('contacts', [{ email: '1' }, { email: '2' }, { email: '3' }]);
			assertEqual(ids(store), before);
			store.setValue('contacts', [{ email: '1' }]);
			assertEqual(ids(store), before.slice(0, 1));
		},
	},
	{
		rule: 'error sources',
		name: 'lists the server, then each failed rule in rule order, then the native fact, and shows the first',
		async run(createStore) {
			const { options, gate } = fixture({
				elements: [
					element({
						$type: 'input',
						name: 'slug',
						rules: [
							{ $type: 'gate', id: 'first' },
							{ $type: 'gate', id: 'second' },
						],
					}),
				],
				defaults: { slug: 'free' },
			});
			const store = createStore(options);
			const answer = await passedSubmission(store);
			answer.setServerErrors({ slug: { message: 'Taken' } });
			gate.settle('free', false);
			store.reportNative({ slug: { type: 'patternMismatch', params: { pattern: '[0-9]+' } } });
			assertEqual(await store.validate(['slug']), { outcome: 'invalid' });
			const shown = errorsOf(store).slug;
			assertEqual(shown.all, [
				{ type: 'server', message: 'Taken', source: 'server' },
				{ type: 'gate', source: 'validation', ruleId: 'first' },
				{ type: 'gate', source: 'validation', ruleId: 'second' },
				{ type: 'patternMismatch', source: 'native', params: { pattern: '[0-9]+' } },
			]);
			const { all, ...fields } = shown;
			assertEqual(fields, all[0]);

			answer.setServerErrors({});
			const withoutServer = errorsOf(store).slug;
			assertSame(withoutServer.type, 'gate');
			assertLength(withoutServer.all, 3);
		},
	},
	{
		rule: 'error sources',
		name: 'native validity is an input to validation: it shows with the timing of validation, and notifies nobody alone',
		async run(createStore) {
			const store = createStore(fixture({ validationMode: 'onSubmit' }).options);
			store.reportNative({ name: { type: 'valueMissing', message: 'Fill in' } });
			assertEqual(await store.validate(['name']), { outcome: 'invalid' });
			assertMatches(errorsOf(store).name, { source: 'native', type: 'valueMissing', message: 'Fill in' });

			store.reportNative({ name: null });
			await waitFor(() => assertEqual(errorsOf(store), {}));
			assertEqual(await store.validate(['name']), { outcome: 'passed' });

			const quiet = createStore(fixture({ validationMode: 'onSubmit' }).options);
			quiet.blur('name');
			quiet.reportNative({ name: { type: 'valueMissing' } });
			assertEqual(errorsOf(quiet), {});

			const onChange = createStore(fixture({ validationMode: 'onChange' }).options);
			onChange.setValue('nickname', 'nick');
			onChange.reportNative({ nickname: { type: 'valueMissing', message: 'Fill in this field' } });
			await waitFor(() => assertSame(errorsOf(onChange).nickname?.source, 'native'));
			assertSame(errorsOf(onChange).nickname.message, 'Fill in this field');
		},
	},
	{
		rule: 'error sources',
		name: 'validate and checkValidity count native facts and server errors alike, and checkValidity writes nothing',
		async run(createStore) {
			const store = createStore(fixture().options);
			store.reportNative({ name: { type: 'valueMissing' } });
			const before = store.getSnapshot();
			assertSame(await store.checkValidity(), false);
			assertSame(store.getSnapshot(), before);
			assertEqual(await store.validate(), { outcome: 'invalid' });
			store.reportNative({ name: null });
			assertSame(await store.checkValidity(), true);
			assertEqual(await store.validate(), { outcome: 'passed' });

			await serverAnswer(store, { name: { message: 'Taken' } });
			assertSame(await store.checkValidity(), false);
			assertEqual(await store.validate(), { outcome: 'invalid' });
		},
	},
	{
		rule: 'error sources',
		name: 'a cleared server source lets validate pass, and the form-level error alone blocks it',
		async run(createStore) {
			const store = createStore(fixture().options);
			const answer = await passedSubmission(store);
			answer.setServerErrors({ [FORM_ROOT]: { message: 'Service unavailable' } });
			assertEqual(await store.validate(), { outcome: 'invalid' });
			assertEqual(await store.validate(['name']), { outcome: 'passed' });
			answer.setServerErrors({});
			assertEqual(await store.validate(), { outcome: 'passed' });
			assertEqual(errorsOf(store), {});
		},
	},
	{
		rule: 'error sources',
		name: 'a source may give a type or a message or neither, and the error still counts',
		async run(createStore) {
			const store = createStore(fixture().options);
			await serverAnswer(store, {
				name: { message: 'Taken' },
				nickname: {},
				'address.street': { type: 'taken' },
			});
			const { errors } = store.getSnapshot();
			assertMatches(errors.name, { type: 'server', message: 'Taken', source: 'server' });
			assertEqual(errors.nickname, {
				type: 'server',
				source: 'server',
				all: [{ type: 'server', source: 'server' }],
			});
			assertMatches(errors['address.street'], { type: 'taken', source: 'server' });
			assertUndefined(errors['address.street'].message);
			assertEqual(await store.validate(['nickname']), { outcome: 'invalid' });
		},
	},
	{
		rule: 'error sources',
		name: 'identical errors change nothing and keep their objects, and a changed one replaces only its own',
		async run(createStore) {
			const store = createStore(fixture().options);
			const answer = await passedSubmission(store);
			answer.setServerErrors({ name: { message: 'Taken' }, nickname: { message: 'Taken' } });
			const before = store.getSnapshot();
			const listener = createSpy();
			store.subscribe(listener);
			answer.setServerErrors({ name: { message: 'Taken' }, nickname: { message: 'Taken' } });
			assertCallCount(listener, 0);
			assertSame(store.getSnapshot(), before);

			answer.setServerErrors({ name: { message: 'Taken' }, nickname: { message: 'Other' } });
			const after = store.getSnapshot();
			assertSame(after.errors.name, before.errors.name);
			assertNotSame(after.errors.nickname, before.errors.nickname);
			assertSame(selectFieldState(after, 'name'), selectFieldState(before, 'name'));
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
			assertSame(store.getSnapshot().errors.name, first.errors.name);
			assertSame(selectFieldState(store.getSnapshot(), 'name'), selectFieldState(first, 'name'));

			store.blur('nickname');
			store.reportNative({ nickname: { type: 'valueMissing' } });
			store.reset();
			store.setValue('nickname', '');
			assertEqual(await store.validate(), { outcome: 'invalid' });
			assertEqual(
				errorsOf(store).nickname.all.map(({ source }) => source),
				['validation'],
			);
		},
	},
	{
		rule: 'array reindexing',
		name: 'toFieldArrayValue gives the same object while the rows are the same, and the commands are one object per path',
		run(createStore) {
			const store = createStore(fixture().options);
			const commands = store.fieldArray('contacts');
			assertSame(store.fieldArray('contacts'), commands);
			const rows = store.getSnapshot().rowIds.contacts;
			assertSame(toFieldArrayValue(rows, commands), toFieldArrayValue(rows, commands));
			store.setValue('name', 'Grace');
			assertSame(
				toFieldArrayValue(store.getSnapshot().rowIds.contacts, commands),
				toFieldArrayValue(rows, commands),
			);
			commands.append({ email: 'x@example.com' });
			assertNotSame(
				toFieldArrayValue(store.getSnapshot().rowIds.contacts, commands),
				toFieldArrayValue(rows, commands),
			);
		},
	},
	{
		rule: 'array reindexing',
		name: 'a hydration whose row ids do not match its own values throws instead of starting from it',
		run(createStore) {
			const good = toHydration(createStore(fixture().options).getSnapshot());
			const start = (hydration: unknown) => () =>
				createStore(fixture({ snapshot: hydration as FormStateHydration }).options);
			assertThrows(start({ ...good, rowIds: { ...good.rowIds, contacts: ['a', 'b'] } }));
			assertThrows(start({ ...good, rowIds: { ...good.rowIds, invites: ['k', 'k'] } }));
			assertThrows(start({ ...good, rowIds: { ...good.rowIds, name: ['x'] } }));
			assertThrows(start({ ...good, rowIds: { ...good.rowIds, contacts: ['a', 'b', 7] } }));
			assertThrows(start({ ...good, rowIds: { contacts: good.rowIds.contacts } }));
			assertThrows(start({ ...good, rowIds: { ...good.rowIds, invites: good.rowIds.contacts } }));
			assertThrows(start({ values: good.values }));
			assertThrows(start('nothing'));
			assertThrows(start(null));
			assertDoesNotThrow(start(good));
		},
	},
	{
		rule: 'array reindexing',
		name: 'containers built from the same defaults mint the same row ids',
		run(createStore) {
			assertEqual(
				createStore(fixture().options).getSnapshot().rowIds,
				createStore(fixture().options).getSnapshot().rowIds,
			);
		},
	},
	{
		rule: 'error sources',
		name: 'refuses a reserved path and a row that does not exist, and writes nothing',
		async run(createStore) {
			const store = createStore(fixture().options);
			const answer = await passedSubmission(store);
			const values = store.getSnapshot().values;
			assertThrows(() => answer.setServerErrors({ __secret: { message: 'x' } }), /reserved segment '__secret'/);
			assertThrows(() => answer.setServerErrors({ 'contacts.__proto__.email': { message: 'x' } }), /reserved/);
			assertThrows(() => store.blur(FORM_ROOT), /reserved/);
			assertThrows(() => store.setValue('__x', 1), /reserved/);
			assertThrows(() => store.reportNative({ __x: { type: 'valueMissing' } }), /reserved/);
			assertThrows(
				() => answer.setServerErrors({ 'contacts.4.email': { message: 'bounced' } }),
				/'contacts.4.email' names row '4' of 'contacts', which has 3 rows/,
			);
			assertThrows(() => answer.setServerErrors({ 'contacts.x': { message: 'x' } }), /names row 'x'/);
			assertThrows(() => answer.setServerErrors({ 'contacts.-1.email': { message: 'x' } }), /names row '-1'/);
			assertThrows(() => answer.setServerErrors({ 'contacts.1e-7.email': { message: 'x' } }), /names row '1e-7'/);
			assertThrows(() => answer.setServerErrors({ 'contacts.01.email': { message: 'x' } }), /names row '01'/);
			assertSame(store.getSnapshot().values, values);
			assertEqual(store.getSnapshot().errors, {});
			assertDoesNotThrow(() =>
				answer.setServerErrors({ 'nothing.here': { message: 'fine' }, [FORM_ROOT]: { message: 'form' } }),
			);
			assertEqual(Object.keys(errorsOf(store)), [FORM_ROOT]);
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
			await waitFor(() => assertSame(gate.pending('taken'), 1));
			assertSame(isValidating(store), true);
			gate.settle('taken', false);
			assertEqual(await run, { outcome: 'invalid' });
			assertSame(errorsOf(store).slug?.type, 'gate');
			assertSame(isValidating(store), false);
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
			await waitFor(() => assertSame(gate.pending('taken'), 1));
			store.reset();
			assertSame(store.getValue('slug'), 'taken');
			gate.settle('taken', false);
			await waitFor(() => assertSame(isValidating(store), false));
			await settle();
			assertEqual(errorsOf(store), {});
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
			await waitFor(() => assertSame(gate.pending('one'), 1));
			store.fieldArray('invites').swap(0, 1);
			gate.settle('one', false);
			await waitFor(() => assertSame(isValidating(store), false));
			await settle();
			assertSame(store.getValue('invites.1.label'), 'first');
			assertEqual(Object.keys(errorsOf(store)), ['invites.1.code']);
			assertEqual(marked(store.getSnapshot().touched), ['invites.1.code']);
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
			await waitFor(() => assertSame(gate.pending('one'), 1));
			store.fieldArray('invites').remove(0);
			gate.settle('one', false);
			await waitFor(() => assertSame(isValidating(store), false));
			await settle();
			assertEqual(errorsOf(store), {});
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
			await waitFor(() => assertSame(gate.pending('taken'), 1));
			store.setValue('slug', 'other');
			store.reset();
			const watch = watchValidation(store);
			gate.settle('taken', false);
			assertEqual(await run, { outcome: 'overtaken' });
			assertSame(watch.started, false);
			assertSame(gate.pending('taken'), 0);
			assertEqual(errorsOf(store), {});
			assertSame(isValidating(store), false);
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
			await waitFor(() => assertSame(gate.pending('one'), 1));
			store.fieldArray('invites').replace([{ code: 'one', label: 'second' }]);
			gate.settle('one', false);
			await waitFor(() => assertSame(isValidating(store), false));
			await settle();
			assertEqual(errorsOf(store), {});
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
			await waitFor(() => assertSame(gate.pending('one'), 1));
			store.fieldArray('groups').swap(0, 1);
			store.fieldArray('groups.1.members').remove(0);
			gate.settle('one', false);
			await waitFor(() => assertSame(isValidating(store), false));
			await settle();
			assertEqual(Object.keys(errorsOf(store)), ['groups.1.members.0.code']);
		},
	},
	{
		rule: 'stale async results',
		name: 'an explicit validate that lost part of its result ends with the verdict of the current state',
		async run(createStore) {
			const { options, gate } = fixture();
			const store = createStore(options);
			gate.hold('one', 'two');
			const run = store.validate(['invites']);
			await waitFor(() => assertSame(gate.pending('one'), 1));
			store.fieldArray('invites').swap(0, 1);
			gate.settle('one', false);
			gate.settle('two', true);
			assertEqual(await run, { outcome: 'invalid' });
			assertEqual(Object.keys(errorsOf(store)), ['invites.1.code']);
			assertSame(isValidating(store), false);
		},
	},
	{
		rule: 'stale async results',
		name: 'drops a result for a path whose value was written while it was running, and ends with the verdict of the current state',
		async run(createStore) {
			const { options, gate } = fixture();
			const store = createStore(options);
			gate.hold('taken');
			store.setValue('slug', 'taken');
			const run = store.validate(['slug']);
			await waitFor(() => assertSame(gate.pending('taken'), 1));
			store.setValue('slug', 'free');
			gate.settle('taken', false);
			assertEqual(await run, { outcome: 'passed' });
			assertUndefined(errorsOf(store).slug);
		},
	},
	{
		rule: 'freshness',
		name: 'a second edit during a validation retry is overtaken, not the validity of a value it never checked',
		async run(createStore) {
			const { options, gate } = fixture();
			const store = createStore(options);
			gate.settle('taken', false);
			gate.hold('a', 'b');
			store.setValue('slug', 'a');
			const run = store.validate(['slug']);
			await waitFor(() => assertSame(gate.pending('a'), 1));
			store.setValue('slug', 'b');
			gate.settle('a', true);
			await waitFor(() => assertSame(gate.pending('b'), 1));
			store.setValue('slug', 'taken');
			gate.settle('b', true);
			assertEqual(await run, { outcome: 'overtaken' });
			assertEqual(await store.validate(['slug']), { outcome: 'invalid' });
		},
	},
	{
		rule: 'freshness',
		name: 'a validate and a submit that one reset overtook end the same way: overtaken is no verdict, and the next check starts clean',
		async run(createStore) {
			const { options, gate } = fixture({ defaults: { name: 'Ada', nickname: 'Ace', slug: 'taken' } });
			const store = createStore(options);
			gate.hold('taken');
			const validated = store.validate(['slug']);
			const submitted = store.submit();
			await waitFor(() => assertSame(gate.pending('taken'), 2));
			store.reset();
			gate.settle('taken', false);
			assertEqual(await validated, { outcome: 'overtaken' });
			assertEqual(await submitted, { outcome: 'overtaken' });
			assertEqual(errorsOf(store), {});
			assertEqual(await store.validate(['slug']), { outcome: 'invalid' });
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
			await waitFor(() => assertSame(gate.pending('one'), 1));
			store.fieldArray('invites').swap(0, 1);
			gate.settle('one', false);
			assertEqual(await run, { outcome: 'invalid' });
			assertEqual(Object.keys(errorsOf(store)), ['invites.1.code']);
		},
	},
	{
		rule: 'freshness',
		name: 'a check whose rows were removed, or that a reset overtook, is overtaken and writes nothing',
		async run(createStore) {
			const { options, gate } = fixture();
			const store = createStore(options);
			gate.hold('two');
			const removed = store.validate(['invites.1.code']);
			await waitFor(() => assertSame(gate.pending('two'), 1));
			store.fieldArray('invites').remove(1);
			gate.settle('two', false);
			assertEqual(await removed, { outcome: 'overtaken' });
			assertEqual(errorsOf(store), {});

			const other = createStore(fixture().options);
			const held = fixture();
			held.gate.hold('one');
			const reset = createStore(held.options);
			const overtaken = reset.validate(['invites.0.code']);
			await waitFor(() => assertSame(held.gate.pending('one'), 1));
			reset.reset();
			held.gate.settle('one', false);
			assertEqual(await overtaken, { outcome: 'overtaken' });
			assertEqual(errorsOf(reset), {});
			assertEqual(await other.validate(), { outcome: 'passed' });
		},
	},
	{
		rule: 'freshness',
		name: 'checkValidity answers for the values, facts and errors current when it was called, and never mixes in later ones',
		async run(createStore) {
			const { options, gate } = fixture();
			const store = createStore(options);
			store.setValue('invites.0.code', 'pending');
			const answer = await passedSubmission(store);
			gate.hold('pending');
			const first = store.checkValidity();
			await waitFor(() => assertSame(gate.pending('pending'), 1));
			answer.setServerErrors({ 'invites.0.code': { type: 'late' } });
			gate.settle('pending', true);
			assertSame(await first, true);
			assertSame(await store.checkValidity(), false);
			store.setValue('invites.0.code', 'other');
			assertSame(await store.checkValidity(), true);
			store.reportNative({ 'invites.0.code': { type: 'valueMissing' } });
			assertSame(await store.checkValidity(), false);
		},
	},
	{
		rule: 'submission-bound validation',
		name: 'an edit during validation followed by a passing retry submits the edited values, and the server answer for them applies',
		async run(createStore) {
			const store = createStore(fixture().options);
			const run = store.submit();
			store.setValue('nickname', 'ada2');
			const submitted = passedOf(await run);
			assertSame(submitted.values.nickname, 'ada2');
			assertEqual(submitted.values, store.getSnapshot().values);
			assertSame(Object.isFrozen(submitted.values), true);
			submitted.setServerErrors({ nickname: { type: 'taken' } });
			assertSame(errorsOf(store).nickname?.type, 'taken');
		},
	},
	{
		rule: 'submission-bound validation',
		name: 'a submission that fails is invalid and has no values, and an edit after a pass drops only the answers for what it touched',
		async run(createStore) {
			const store = createStore(fixture().options);
			store.setValue('name', '');
			assertEqual(await store.submit(), { outcome: 'invalid' });

			store.setValue('name', 'Grace');
			const submitted = await passedSubmission(store);
			assertSame(submitted.values.name, 'Grace');
			store.setValue('nickname', 'changed');
			submitted.setServerErrors({ name: { type: 'taken' }, nickname: { type: 'taken' } });
			assertEqual(Object.keys(errorsOf(store)), ['name']);
		},
	},
	{
		rule: 'submission-bound validation',
		name: 'a submission a later one superseded ends overtaken, and the values of a passed one are plain frozen data',
		async run(createStore) {
			const store = createStore(fixture().options);
			const older = store.submit();
			const newer = store.submit();
			store.setValue('name', 'Grace');
			assertEqual(await older, { outcome: 'overtaken' });
			const submitted = passedOf(await newer);
			assertSame(submitted.values.name, 'Grace');
			assertSame(Object.isFrozen(submitted.values), true);
			assertSame(submitted.values, submitted.values);
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
			await waitFor(() => assertSame(gate.pending('one'), 1));
			assertEqual(store.getSnapshot().validating, { 'invites.0.code': true });
			assertSame(isValidating(store), true);
			assertSame(fieldState(store, 'invites.0.code').isValidating, true);
			assertSame(fieldState(store, 'invites.1.code').isValidating, false);
			store.fieldArray('invites').swap(0, 1);
			assertEqual(store.getSnapshot().validating, { 'invites.1.code': true });
			gate.settle('one', true);
			await waitFor(() => assertSame(isValidating(store), false));
			await settle();
			assertEqual(store.getSnapshot().validating, {});

			const racing = fixture();
			racing.gate.hold('a');
			const second = createStore(racing.options);
			second.setValue('slug', 'a');
			const older = second.validate(['slug']);
			await waitFor(() => assertSame(racing.gate.pending('a'), 1));
			second.setValue('slug', 'b');
			assertEqual(await second.validate(['slug']), { outcome: 'passed' });
			assertEqual(second.getSnapshot().validating, {});
			racing.gate.settle('a', true);
			assertEqual(await older, { outcome: 'passed' });
		},
	},
	{
		rule: 'pending per field',
		name: 'a superseded async check leaves no issue and no pending mark: pending is state, never an issue',
		async run(createStore) {
			const restoreFetch = stubGlobal(
				'fetch',
				createSpy(async () => new Response(JSON.stringify({ valid: true }))),
			);
			try {
				const store = createStore(
					custom(
						[
							{
								$type: 'input',
								name: 'handle',
								rules: [{ $type: 'async', url: '/check', debounce: 30, disableCache: true }],
							},
						],
						{ handle: '' },
						{ validationMode: 'onChange' },
					),
				);
				store.setValue('handle', 'a');
				store.setValue('handle', 'ab');
				await waitFor(() => assertSame(isValidating(store), false), { timeout: 2000 });
				assertEqual(errorsOf(store), {});
				assertEqual(store.getSnapshot().warnings, {});
				assertEqual(store.getSnapshot().validating, {});
				assertNotMatches(JSON.stringify(store.getSnapshot()), /pending/i);
				assertEqual(await store.validate(), { outcome: 'passed' });
			} finally {
				restoreFetch();
			}
		},
	},
	{
		rule: 'server errors tied to a submission',
		name: 'a response for values that were edited since the submission began is dropped',
		async run(createStore) {
			const store = createStore(fixture().options);
			const old = await passedSubmission(store);
			old.setServerErrors({ name: { type: 'old' } });
			assertSame(errorsOf(store).name?.type, 'old');
			const submission = await passedSubmission(store);
			assertEqual(errorsOf(store), {});
			store.setValue('name', 'Grace');
			submission.setServerErrors({ name: { type: 'taken' }, nickname: { type: 'blocked' } });
			assertEqual(Object.keys(errorsOf(store)), ['nickname']);
			store.setValue('nickname', 'other');
			assertEqual(errorsOf(store), {});

			const formWide = await passedSubmission(store);
			store.setValue('slug', 'changed');
			formWide.setServerErrors({ [FORM_ROOT]: { type: 'invalid_credentials' } });
			assertEqual(errorsOf(store), {});
		},
	},
	{
		rule: 'server errors tied to a submission',
		name: 'an error for a submitted row lands on that row wherever it is now, and is dropped when the row is gone',
		async run(createStore) {
			const store = createStore(fixture().options);
			const submission = await passedSubmission(store);
			store.fieldArray('contacts').swap(0, 1);
			submission.setServerErrors({
				'contacts.0.email': { type: 'bounced' },
				'contacts.2.email': { type: 'blocked' },
			});
			assertEqual(Object.keys(errorsOf(store)).toSorted(), ['contacts.1.email', 'contacts.2.email']);
			store.fieldArray('contacts').remove(2);
			const again = await passedSubmission(store);
			store.fieldArray('contacts').remove(0);
			again.setServerErrors({ 'contacts.0.email': { type: 'bounced' } });
			assertEqual(errorsOf(store), {});
		},
	},
	{
		rule: 'server errors tied to a submission',
		name: 'a cross-field error is dropped when a value its rules read changed, and cleared when one changes after it was applied',
		async run(createStore) {
			const store = createStore(passwordForm());
			const stale = await passedSubmission(store);
			store.setValue('password', 'b');
			stale.setServerErrors({ confirm: { type: 'mismatch' } });
			assertEqual(errorsOf(store), {});

			store.setValue('password', 'a');
			const fresh = await passedSubmission(store);
			fresh.setServerErrors({ confirm: { type: 'mismatch' } });
			assertSame(errorsOf(store).confirm?.type, 'mismatch');
			store.setValue('password', 'b');
			assertEqual(errorsOf(store), {});
		},
	},
	{
		rule: 'server errors tied to a submission',
		name: 'an answer to a submission from before a reset, or to a superseded one, is ignored',
		async run(createStore) {
			const store = createStore(fixture().options);
			const beforeReset = await passedSubmission(store);
			store.reset();
			beforeReset.setServerErrors({ name: { type: 'taken' } });
			assertEqual(errorsOf(store), {});

			const first = await passedSubmission(store);
			const second = await passedSubmission(store);
			first.setServerErrors({ name: { type: 'taken' } });
			assertEqual(errorsOf(store), {});
			second.setServerErrors({ name: { type: 'taken' } });
			assertSame(errorsOf(store).name?.type, 'taken');
			assertEqual(second.values, store.getSnapshot().values);
		},
	},
	{
		rule: 'server errors tied to a submission',
		name: 'a path takes one issue or several, each with a code, params and an optional message',
		async run(createStore) {
			const store = createStore(fixture().options);
			const submission = await passedSubmission(store);
			submission.setServerErrors({
				name: [
					{ type: 'taken', message: 'Already registered' },
					{ type: 'blocked_domain', params: { domain: 'example.com' } },
				],
				nickname: [],
			});
			assertEqual(Object.keys(errorsOf(store)), ['name']);
			assertEqual(errorsOf(store).name.all, [
				{ type: 'taken', source: 'server', message: 'Already registered' },
				{ type: 'blocked_domain', source: 'server', params: { domain: 'example.com' } },
			]);
		},
	},
	{
		rule: 'native facts',
		name: 'a fact describes the value it came with: a later write makes it stale, and a programmatic write never reuses it',
		async run(createStore) {
			const store = createStore(fixture({ validationMode: 'onChange' }).options);
			store.setValue('nickname', 'bad');
			store.reportNative({ nickname: { type: 'typeMismatch' } });
			await waitFor(() => assertSame(errorsOf(store).nickname?.source, 'native'));
			assertSame(await store.checkValidity(), false);
			store.setValue('nickname', 'good');
			await waitFor(() => assertUndefined(errorsOf(store).nickname));
			assertSame(await store.checkValidity(), true);
			store.setValue('nickname', 'bad');
			await settle();
			assertUndefined(errorsOf(store).nickname);
			assertEqual(await store.validate(['nickname']), { outcome: 'passed' });
		},
	},
	{
		rule: 'native facts',
		name: 'reporting the fact already held, or writing the value already held, changes nothing',
		async run(createStore) {
			const store = createStore(fixture({ validationMode: 'onChange' }).options);
			store.setValue('nickname', 'nick');
			store.reportNative({ nickname: { type: 'badInput' } });
			await waitFor(() => assertSame(errorsOf(store).nickname?.source, 'native'));
			await waitFor(() => assertSame(isValidating(store), false));
			await settle();
			const watch = watchValidation(store);
			const before = store.getSnapshot();
			store.reportNative({ nickname: { type: 'badInput' } });
			store.setValue('nickname', 'nick');
			await settle();
			assertSame(watch.started, false);
			assertSame(store.getSnapshot(), before);
			assertSame(await store.checkValidity(), false);
		},
	},
	{
		rule: 'native facts',
		name: 'reportNative binds facts to the values held now, validates only paths already checked, and is no user change',
		async run(createStore) {
			const store = createStore(fixture({ validationMode: 'onChange' }).options);
			const listener = createSpy();
			store.subscribe(listener);
			store.reportNative({ nickname: { type: 'valueMissing' } });
			await settle();
			assertEqual(errorsOf(store), {});
			assertEqual(store.getSnapshot().dirty, {});
			assertEqual(store.getSnapshot().touched, {});
			assertCallCount(listener, 0);
			assertSame(await store.checkValidity(), false);

			assertEqual(await store.validate(['name']), { outcome: 'passed' });
			store.reportNative({ name: { type: 'typeMismatch', params: { type: 'email' } }, nickname: null });
			await waitFor(() => assertSame(errorsOf(store).name?.type, 'typeMismatch'));
			assertSame(await store.checkValidity(), false);
			store.reportNative({ name: null });
			await waitFor(() => assertUndefined(errorsOf(store).name));
			assertSame(await store.checkValidity(), true);
			assertEqual(store.getSnapshot().dirty, {});
		},
	},
	{
		rule: 'native facts',
		name: 'a reset form that hears from its controls again shows no error, and a path the container does not hold is ignored',
		async run(createStore) {
			const store = createStore(fixture({ validationMode: 'onChange' }).options);
			store.setValue('nickname', 'x');
			store.reportNative({ nickname: { type: 'typeMismatch' } });
			await waitFor(() => assertSame(errorsOf(store).nickname?.source, 'native'));
			store.reset();
			store.reportNative({
				nickname: { type: 'valueMissing' },
				'contacts.9.email': { type: 'valueMissing' },
				'nothing.here': { type: 'valueMissing' },
			});
			await settle();
			assertEqual(errorsOf(store), {});
			assertSame(store.getSnapshot().isValid, true);
			store.fieldArray('contacts').remove(2);
			assertDoesNotThrow(() => store.reportNative({ 'contacts.2.email': { type: 'valueMissing' } }));
			assertSame(await store.checkValidity(), false);
		},
	},
	{
		rule: 'native facts',
		name: 'a fact moves with its row, and a removed row never returns as a native error',
		async run(createStore) {
			const store = createStore(fixture().options);
			store.blur('contacts.1.label');
			store.reportNative({ 'contacts.1.label': { type: 'typeMismatch' } });
			store.fieldArray('contacts').swap(1, 2);
			assertEqual(await store.validate(), { outcome: 'invalid' });
			assertEqual(Object.keys(errorsOf(store)), ['contacts.2.label']);
			store.fieldArray('contacts').remove(2);
			assertEqual(await store.validate(), { outcome: 'passed' });
			assertEqual(errorsOf(store), {});
		},
	},
	{
		rule: 'native facts',
		name: 'a fact stays held until its control withdraws it: every held fact counts for validate and checkValidity',
		async run(createStore) {
			const store = createStore(fixture().options);
			store.reportNative({ name: { type: 'valueMissing' }, nickname: { type: 'valueMissing' } });
			assertSame(await store.checkValidity(), false);
			store.reportNative({ nickname: null });
			assertSame(await store.checkValidity(), false);
			assertEqual(await store.validate(), { outcome: 'invalid' });
			assertEqual(Object.keys(errorsOf(store)), ['name']);
			store.reportNative({ name: null });
			assertSame(await store.checkValidity(), true);
			assertEqual(await store.validate(), { outcome: 'passed' });
			assertEqual(errorsOf(store), {});
		},
	},
	{
		rule: 'native facts',
		name: 'one call reports several controls in one commit, and ignores the rows that do not exist',
		async run(createStore) {
			const store = createStore(fixture().options);
			const listener = createSpy();
			store.subscribe(listener);
			store.reportNative({
				name: { type: 'valueMissing' },
				nickname: { type: 'valueMissing' },
				'contacts.9.email': { type: 'valueMissing' },
			});
			assertCallCount(listener, 0);
			assertEqual(await store.validate(), { outcome: 'invalid' });
			assertEqual(Object.keys(errorsOf(store)).toSorted(), ['name', 'nickname']);
			store.reportNative({ name: null, nickname: null });
			await waitFor(() => assertEqual(errorsOf(store), {}));
			assertEqual(await store.validate(), { outcome: 'passed' });
		},
	},
	{
		rule: 'native facts',
		name: 'facts for rows that do not exist are ignored, and facts and params are copied so a caller cannot change a snapshot',
		async run(createStore) {
			const store = createStore(fixture().options);
			store.fieldArray('contacts').remove([0, 1, 2]);
			assertThrows(() => store.blur('contacts.0.label'), /names row/);
			store.setValue('contacts', null);
			store.reportNative({
				'contacts.0.label': { type: 'valueMissing' },
				'contacts.1.label': { type: 'valueMissing' },
			});
			await store.validate();
			assertEqual(
				Object.keys(errorsOf(store)).filter((path) => path.endsWith('.label')),
				[],
			);
			store.setValue('contacts', []);

			const allowed = ['first'];
			const answer = await passedSubmission(store);
			answer.setServerErrors({ name: { type: 'invalid', params: { allowed } } });
			const fact = { type: 'rangeUnderflow', params: { list: ['a'] } };
			store.reportNative({ nickname: fact });
			await store.validate(['nickname']);
			allowed.push('second');
			fact.params.list.push('b');
			assertEqual(errorsOf(store).name.params, { allowed: ['first'] });
			assertEqual(errorsOf(store).nickname.params, { list: ['a'] });
			assertSame(Object.isFrozen((errorsOf(store).name.params as { allowed: string[] }).allowed), true);
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
			await waitFor(() => assertSame(gate.pending('two'), 1));
			assertEqual(store.getSnapshot().validating, { 'invites.1.code': true });
			store.setValue('invites', []);
			assertEqual(store.getSnapshot().validating, {});
			gate.settle('two', true);
			assertEqual(await run, { outcome: 'overtaken' });
			assertEqual(store.getSnapshot().validating, {});
			assertSame(isValidating(store), false);
		},
	},
	{
		rule: 'participation',
		name: 'a field a constraint hides takes no part: it does not block, count or show, however it was recorded',
		async run(createStore) {
			const store = createStore(businessForm());
			assertEqual(await store.validate(), { outcome: 'passed' });
			assertSame(await store.checkValidity(), true);
			assertEqual(errorsOf(store), {});

			store.setValue('kind', 'business');
			assertEqual(await store.validate(), { outcome: 'invalid' });
			assertMatches(errorsOf(store).company, { type: 'required', ruleId: 'company-required' });
			store.setValue('kind', 'person');
			assertEqual(errorsOf(store), {});
			assertSame(store.getSnapshot().isValid, true);
			assertEqual(await store.validate(), { outcome: 'passed' });

			await serverAnswer(store, { company: { type: 'taken' } });
			store.blur('company');
			store.reportNative({ company: { type: 'valueMissing' } });
			assertSame(store.getSnapshot().isValid, true);
			assertEqual(await store.validate(), { outcome: 'passed' });
			assertSame(await store.checkValidity(), true);
		},
	},
	{
		rule: 'participation',
		name: 'a step its constraints hide is skipped: its fields take no part, its values are kept and the submitted values leave them out',
		async run(createStore) {
			const store = createStore(stepsForm({ hasCompany: false, wantsInvoice: 'no', company: '', vat: '' }));
			assertEqual(await store.validate(), { outcome: 'passed' });
			assertSame(await store.checkValidity(), true);
			assertEqual(errorsOf(store), {});
			const submitted = await store.submit();
			assertSame(submitted.outcome, 'passed');
			if (submitted.outcome === 'passed') assertEqual(submitted.values, { hasCompany: false });
			assertMatches(store.getSnapshot().values, { wantsInvoice: 'no', company: '' });

			store.setValue('hasCompany', true);
			assertEqual(await store.validate(), { outcome: 'invalid' });
			assertEqual(Object.keys(errorsOf(store)), ['company']);
		},
	},
	{
		rule: 'participation',
		name: 'a value that takes no part is absent for the constraints after it, in order: a skipped step cannot keep a later field shown',
		async run(createStore) {
			const store = createStore(stepsForm({ hasCompany: false, wantsInvoice: 'yes', company: '', vat: '' }));
			assertEqual(await store.validate(), { outcome: 'passed' });
			assertSame(await store.checkValidity(), true);
			store.setValue('hasCompany', true);
			store.setValue('company', 'Acme');
			assertEqual(await store.validate(), { outcome: 'invalid' });
			assertEqual(Object.keys(errorsOf(store)), ['vat']);
			store.setValue('hasCompany', false);
			assertEqual(errorsOf(store), {});
			assertEqual(await store.validate(), { outcome: 'passed' });
		},
	},
	{
		rule: 'participation',
		name: 'a path that takes part again is re-validated when it was checked before, and waits for its timing otherwise',
		async run(createStore) {
			const checked = createStore(businessForm({ kind: 'business', company: '' }));
			assertEqual(await checked.validate(), { outcome: 'invalid' });
			checked.setValue('kind', 'person');
			assertEqual(errorsOf(checked), {});
			checked.setValue('kind', 'business');
			await waitFor(() => assertSame(errorsOf(checked).company?.type, 'required'));

			const untouched = createStore(businessForm());
			untouched.setValue('kind', 'business');
			await settle();
			assertEqual(errorsOf(untouched), {});
			assertSame(untouched.getSnapshot().isValid, true);
		},
	},
	{
		rule: 'participation',
		name: 'disabled fields, authored or by a constraint, and everything inside an excluded container, are excluded; an inactive step is not',
		async run(createStore) {
			const store = createStore(
				custom(
					[
						{ $type: 'input', name: 'locked', disabled: true, rules: [{ $type: 'required' }] },
						{ $type: 'input', name: 'mode' },
						{
							$type: 'input',
							name: 'frozen',
							rules: [{ $type: 'required' }],
							constraints: [{ field: 'mode', $type: 'enable', operator: 'equals', value: 'edit' }],
						},
						{
							$type: 'fieldset',
							name: 'extra',
							constraints: [{ field: 'mode', $type: 'show', operator: 'equals', value: 'edit' }],
							elements: [{ $type: 'input', name: 'note', rules: [{ $type: 'required' }] }],
						},
						{ $type: 'input', name: 'later', rules: [{ $type: 'required' }] },
					],
					{ locked: '', mode: 'view', frozen: '', extra: { note: '' }, later: '' },
				),
			);
			assertEqual(await store.validate(), { outcome: 'invalid' });
			assertEqual(Object.keys(errorsOf(store)), ['later']);
			store.setValue('later', 'x');
			assertEqual(await store.validate(), { outcome: 'passed' });
			store.setValue('mode', 'edit');
			assertEqual(await store.validate(), { outcome: 'invalid' });
			assertEqual(Object.keys(errorsOf(store)).toSorted(), ['extra.note', 'frozen']);
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
								{ $type: 'required', id: 'tag-required' },
								{ $type: 'pattern', id: 'tag-letters', value: '^[a-z]+$', message: 'Letters only' },
								{ $type: 'pattern', id: 'tag-short', value: '^.{0,3}$', message: 'Three at most' },
								{ $type: 'minLength', value: 8 },
							],
						},
					],
					{ tag: 'AB1234' },
				),
			);
			assertEqual(await store.validate(), { outcome: 'invalid' });
			const { all } = errorsOf(store).tag;
			assertEqual(
				all.map(({ type, ruleId }) => [type, ruleId]),
				[
					['pattern', 'tag-letters'],
					['pattern', 'tag-short'],
					['minLength', undefined],
				],
			);
			assertEqual(all[0], {
				type: 'pattern',
				source: 'validation',
				ruleId: 'tag-letters',
				params: { pattern: '^[a-z]+$' },
				message: 'Letters only',
			});
			assertEqual(all[2].params, { minLength: 8 });
			assertUndefined(all[2].message);
			assertSame(Object.isFrozen(all[2].params), true);
		},
	},
	{
		rule: 'issue identity',
		name: 'rules are listed in authored order whatever order their checks finish in, and unchanged issues keep their objects',
		async run(createStore) {
			const { options, gate } = fixture({
				elements: [
					element({
						$type: 'input',
						name: 'slug',
						rules: [{ $type: 'gate' }, { $type: 'minLength', value: 5, message: 'Too short' }],
					}),
				],
				defaults: { slug: 'ab' },
			});
			const store = createStore(options);
			gate.hold('ab');
			const run = store.validate();
			await waitFor(() => assertSame(gate.pending('ab'), 1));
			gate.settle('ab', false);
			assertEqual(await run, { outcome: 'invalid' });
			const first = errorsOf(store).slug;
			assertEqual(
				first.all.map(({ type }) => type),
				['gate', 'minLength'],
			);
			await store.validate();
			assertSame(errorsOf(store).slug, first);
		},
	},
	{
		rule: 'validator failures',
		name: 'a rule that throws is no field error: validate and checkValidity reject naming it, an automatic check logs it, the others still report',
		async run(createStore) {
			const options = custom(
				[
					{
						$type: 'input',
						name: 'secret',
						rules: [
							{ $type: 'required', id: 'secret-required' },
							{ $type: 'boom', id: 'secret-boom' },
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
			assertMatches(rejected, {
				name: 'FormValidationFailure',
				path: 'secret',
				ruleType: 'boom',
				ruleId: 'secret-boom',
			});
			const check: unknown = await store.checkValidity().then(
				() => undefined,
				(error: unknown) => error,
			);
			assertMatches(check, { path: 'secret', ruleType: 'boom' });
			assertSame(isValidating(store), false);

			const logged = spyOn(logger, 'error');
			try {
				const automatic = createStore(options);
				automatic.setValue('secret', 'x');
				automatic.setValue('secret', '');
				await waitFor(() => assertDefined(errorsOf(automatic).secret));
				const report = logged.spy.calls.find(
					([message]) => typeof message === 'string' && message.includes("'secret'"),
				);
				assertMatches(report?.[1], { error: { path: 'secret', ruleType: 'boom', ruleId: 'secret-boom' } });
				assertEqual(errorsOf(automatic).secret?.all, [
					{ type: 'required', source: 'validation', ruleId: 'secret-required' },
				]);
				assertSame(automatic.getSnapshot().isValid, false);
			} finally {
				logged.restore();
			}
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
									$type: 'minLength',
									value: 8,
									severity: 'warning',
									id: 'password-strength',
									message: 'Weak',
								},
								{ $type: 'minLength', value: 3, message: 'Too short' },
							],
						},
					],
					{ password: 'abcd' },
					{ validationMode: 'onChange' },
				),
			);
			store.setValue('password', 'abcde');
			await waitFor(() => assertDefined(store.getSnapshot().warnings.password));
			assertEqual(store.getSnapshot().warnings.password, {
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
			assertEqual(errorsOf(store), {});
			assertSame(store.getSnapshot().isValid, true);
			assertEqual(await store.validate(), { outcome: 'passed' });
			assertSame(await store.checkValidity(), true);
			const field = fieldState(store, 'password');
			assertMatches(field, { invalid: false, error: undefined });
			assertSame(fieldState(store, 'password').warning, field.warning);
			store.setValue('password', 'abcdefgh');
			await waitFor(() => assertEqual(store.getSnapshot().warnings, {}));
			store.setValue('password', 'a');
			await waitFor(() => assertSame(errorsOf(store).password?.message, 'Too short'));
			assertSame(store.getSnapshot().warnings.password?.message, 'Weak');
			assertEqual(await store.validate(), { outcome: 'invalid' });
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
							rules: [{ $type: 'required', severity: 'warning' }],
							constraints: [{ field: 'kind', $type: 'show', operator: 'equals', value: 'business' }],
						},
					],
					{ kind: 'business', company: '' },
				),
			);
			assertEqual(await store.validate(), { outcome: 'passed' });
			assertSame(store.getSnapshot().warnings.company?.type, 'required');
			store.setValue('kind', 'person');
			assertEqual(store.getSnapshot().warnings, {});
		},
	},
	{
		rule: 'issue identity',
		name: 'an async rule reports the endpoint text on its own channel, never library text, and an outage is a failure to run and is not cached',
		async run(createStore) {
			let reply: () => Response = () => new Response(JSON.stringify({ valid: false }));
			const fetchSpy = createSpy(async () => reply());
			const restoreFetch = stubGlobal('fetch', fetchSpy);
			try {
				const options = custom(
					[
						{
							$type: 'input',
							name: 'handle',
							rules: [
								{
									$type: 'async',
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
				assertEqual(await store.validate(), { outcome: 'invalid' });
				assertEqual(errorsOf(store).handle.all, [
					{ type: 'async', source: 'validation', ruleId: 'handle-free' },
				]);

				reply = () => new Response(JSON.stringify({ valid: false, message: 'Handle is taken' }));
				store.setValue('handle', 'ada2');
				assertEqual(await store.validate(), { outcome: 'invalid' });
				assertSame(errorsOf(store).handle.message, 'Handle is taken');
				assertNotMatches(JSON.stringify(store.getSnapshot()), /Invalid input|secret|\/check/);

				reply = () => new Response('no', { status: 503 });
				store.setValue('handle', 'ada3');
				const down: unknown = await store.validate().then(
					() => undefined,
					(error: unknown) => error,
				);
				assertMatches(down, { name: 'FormValidationFailure', path: 'handle', ruleType: 'async' });
				assertSame((down as { cause: Error }).cause.name, 'ValidationUnavailable');
				const calls = fetchSpy.calls.length;
				reply = () => new Response(JSON.stringify({ valid: true }));
				assertEqual(await store.validate(), { outcome: 'passed' });
				assertSame(fetchSpy.calls.length, calls + 1);

				fetchSpy.implement(async () => {
					throw new Error('offline');
				});
				const offline: unknown = await createStore({ ...options, defaults: { handle: 'zed' } })
					.validate()
					.then(
						() => undefined,
						(error: unknown) => error,
					);
				assertSame((offline as { cause: Error }).cause.name, 'ValidationUnavailable');
			} finally {
				restoreFetch();
			}
		},
	},
	{
		rule: 'submission-bound validation',
		name: 'a submission ends passed, invalid, or overtaken',
		async run(createStore) {
			const store = createStore(fixture().options);
			assertSame((await store.submit()).outcome, 'passed');

			store.setValue('name', '');
			assertEqual(await store.submit(), { outcome: 'invalid' });

			const edit = fixture();
			const edited = createStore(edit.options);
			edit.gate.settle('taken', false);
			edit.gate.hold('a', 'b');
			edited.setValue('slug', 'a');
			const outrun = edited.submit();
			await waitFor(() => assertSame(edit.gate.pending('a'), 1));
			edited.setValue('slug', 'b');
			edit.gate.settle('a', true);
			await waitFor(() => assertSame(edit.gate.pending('b'), 1));
			edited.setValue('slug', 'taken');
			edit.gate.settle('b', true);
			assertEqual(await outrun, { outcome: 'overtaken' });

			const hold = fixture();
			const reset = createStore(hold.options);
			hold.gate.hold('free');
			const cleared = reset.submit();
			await waitFor(() => assertSame(hold.gate.pending('free'), 1));
			reset.reset();
			hold.gate.settle('free', true);
			assertEqual(await cleared, { outcome: 'overtaken' });
		},
	},
	{
		rule: 'paths of writes',
		name: 'a reserved path rejects the whole reportNative call before any write, and every reserved segment is named',
		async run(createStore) {
			const store = createStore(fixture().options);
			const before = store.getSnapshot();
			assertThrows(
				() => store.reportNative({ name: { type: 'valueMissing' }, __x: { type: 'valueMissing' } }),
				/reserved/,
			);
			assertThrows(() => store.reportNative({ 'a.constructor': null }), /'constructor'/);
			assertSame(await store.checkValidity(), true);
			assertSame(store.getSnapshot(), before);
			assertThrows(() => store.setValue('prototype.x', 1), /__.*constructor.*prototype/s);
		},
	},
	{
		rule: 'native facts',
		name: 'a fact reported while the check of a write runs is not lost: the rule error and the native one both appear',
		async run(createStore) {
			const store = createStore(fixture({ validationMode: 'onChange' }).options);
			store.setValue('nickname', '');
			assertSame(store.getSnapshot().validating.nickname, true);
			store.reportNative({ nickname: { type: 'valueMissing' } });
			await waitFor(() =>
				assertEqual(
					errorsOf(store).nickname?.all.map(({ source }) => source),
					['validation', 'native'],
				),
			);
			assertSame(isValidating(store), false);

			const touched = createStore(fixture({ validationMode: 'onTouched' }).options);
			touched.blur('name');
			touched.setValue('name', '');
			touched.reportNative({ name: { type: 'valueMissing' } });
			await waitFor(() =>
				assertEqual(
					errorsOf(touched).name?.all.map(({ source }) => source),
					['validation', 'native'],
				),
			);
		},
	},
	{
		rule: 'submission-bound validation',
		name: 'a later submission overtakes the earlier one, which has no verdict',
		async run(createStore) {
			const store = createStore(fixture().options);
			const first = store.submit();
			const second = store.submit();
			assertEqual(await first, { outcome: 'overtaken' });
			assertSame((await second).outcome, 'passed');
		},
	},
	{
		rule: 'validator failures',
		name: 'a failure says why a rule did not run: the service was unavailable, or the rule threw',
		async run(createStore) {
			const restoreFetch = stubGlobal(
				'fetch',
				createSpy(async () => new Response('no', { status: 500 })),
			);
			try {
				const unavailable = createStore(
					custom(
						[
							{
								$type: 'input',
								name: 'handle',
								rules: [{ $type: 'async', url: '/check', disableCache: true }],
							},
						],
						{ handle: 'a' },
					),
				);
				const down: unknown = await unavailable.validate().then(
					() => undefined,
					(error: unknown) => error,
				);
				assertMatches(down, { path: 'handle', ruleType: 'async', reason: 'unavailable' });

				const threw = createStore(
					custom([{ $type: 'input', name: 'secret', rules: [{ $type: 'boom' }] }], { secret: '' }),
				);
				const exploded: unknown = await threw.validate().then(
					() => undefined,
					(error: unknown) => error,
				);
				assertMatches(exploded, { path: 'secret', ruleType: 'boom', reason: 'error' });
			} finally {
				restoreFetch();
			}
		},
	},
	{
		rule: 'submission-bound validation',
		name: 'the values of a submission leave out the paths that take no part, and carry the payload, which is never rendered or validated',
		async run(createStore) {
			const options = custom(
				[
					{ $type: 'input', name: 'kind' },
					{
						$type: 'input',
						name: 'company',
						rules: [{ $type: 'required' }],
						constraints: [{ field: 'kind', $type: 'show', operator: 'equals', value: 'business' }],
					},
					{ $type: 'input', name: 'locked', disabled: true },
					{
						$type: 'arrayElements',
						name: 'rows',
						elements: [
							{ $type: 'input', name: 'role' },
							{
								$type: 'input',
								name: 'fax',
								constraints: [{ field: 'role', $type: 'hide', operator: 'equals', value: 'office' }],
							},
						],
					},
				],
				{
					kind: 'person',
					company: 'Acme',
					locked: 'x',
					rows: [
						{ role: 'office', fax: '1' },
						{ role: 'home', fax: '2' },
					],
				},
				{ payload: { tenant: 't1', context: { source: 'email' } } },
			);
			const store = createStore(options);
			const submitted = await passedSubmission(store);
			assertEqual(submitted.values, {
				kind: 'person',
				rows: [{ role: 'office' }, { role: 'home', fax: '2' }],
				tenant: 't1',
				context: { source: 'email' },
			});
			assertSame(Object.isFrozen(submitted.values), true);
			assertNoProperty(store.getSnapshot().values, 'tenant');
			assertEqual(store.getSnapshot().dirty, {});
			store.setValue('kind', 'business');
			const next = await passedSubmission(store);
			assertMatches(next.values, { company: 'Acme', tenant: 't1' });
			assertNoProperty(next.values, 'locked');
		},
	},
	{
		rule: 'touched and dirty',
		name: 'blur marks the path touched in one notification and validates by mode; written first, the value ends as one command would leave it',
		async run(createStore) {
			const quiet = createStore(fixture().options);
			const listener = createSpy();
			quiet.subscribe(listener);
			quiet.blur('name');
			assertCallCount(listener, 1);
			assertEqual(quiet.getSnapshot().touched, { name: true });
			assertSame(quiet.getValue('name'), 'Ada');
			assertEqual(quiet.getSnapshot().dirty, {});

			const store = createStore(fixture({ validationMode: 'onBlur' }).options);
			store.setValue('name', '');
			store.blur('name');
			await waitFor(() => assertSame(errorsOf(store).name?.type, 'required'));
			assertSame(store.getSnapshot().dirty.name, true);
			assertSame(store.getSnapshot().touched.name, true);
		},
	},
	{
		rule: 'paths of writes',
		name: 'setValue and blur refuse a row the array does not have, and a reserved segment, instead of leaving holes',
		run(createStore) {
			const store = createStore(fixture().options);
			const before = store.getSnapshot();
			assertThrows(
				() => store.setValue('contacts.3.email', 'x'),
				/'contacts.3.email' names row '3' of 'contacts'/,
			);
			assertThrows(() => store.setValue('contacts.-1.email', 'x'), /names row '-1'/);
			assertThrows(() => store.blur('contacts.5.email'), /names row '5'/);
			assertThrows(() => store.setValue('name.3.x', 'x'), /names row '3' of 'name'/);
			assertThrows(() => store.setValue('name.03.x', 'x'), /names row '03' of 'name'/);
			assertThrows(() => store.setValue('__secret', 1), /reserved segment/);
			assertSame(store.getSnapshot(), before);
			store.fieldArray('contacts').append({ email: 'd@example.com' });
			store.setValue('contacts.3.email', 'e@example.com');
			assertLength(store.getSnapshot().rowIds.contacts, 4);
			assertSame(
				store.getSnapshot().rowIds.contacts.every((id) => typeof id === 'string'),
				true,
			);
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
			assertSame(watch.started, false);
			store.blur('name');
			await waitFor(() => assertSame(errorsOf(store).name?.type, 'required'));
			store.setValue('name', 'Ada');
			await waitFor(() => assertUndefined(errorsOf(store).name));
			store.setValue('name', '');
			await waitFor(() => assertSame(errorsOf(store).name?.type, 'required'));
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
								{ $type: 'maxLength', value: 2 },
								{
									$type: 'relate',
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
								{ $type: 'min', value: 5 },
								{ $type: 'max', value: 1 },
							],
						},
						{
							$type: 'arrayElements',
							name: 'rows',
							rules: [{ $type: 'minItems', value: 2 }],
							elements: [{ $type: 'input', name: 'x' }],
						},
					],
					{ tag: 'abc', other: 'z', count: 3, rows: [{ x: '' }] },
				),
			);
			assertEqual(await store.validate(), { outcome: 'invalid' });
			const errors = errorsOf(store);
			assertEqual(errors.tag.all, [
				{ type: 'maxLength', source: 'validation', params: { maxLength: 2 } },
				{ type: 'relate', source: 'validation', ruleId: 'same', params: { assert: 'allEqual' } },
			]);
			assertEqual(
				errors.count.all.map(({ params }) => params),
				[{ min: 5 }, { max: 1 }],
			);
			assertEqual(errors.rows.params, { minItems: 2 });
			assertNotMatches(JSON.stringify(errors), /Too (small|big)|Invalid input/);
		},
	},
	{
		rule: 'native facts',
		name: 'a fact for a path no field declares is ignored: it does not block validate, checkValidity or a submission',
		async run(createStore) {
			const store = createStore(fixture().options);
			const before = store.getSnapshot();
			store.reportNative({
				ghost: { type: 'valueMissing' },
				'name.x': { type: 'valueMissing' },
				'address.nowhere': { type: 'valueMissing' },
				'contacts.0.nothing': { type: 'valueMissing' },
			});
			assertEqual(await store.validate(), { outcome: 'passed' });
			assertSame(await store.checkValidity(), true);
			assertEqual(errorsOf(store), {});
			assertSame(store.getSnapshot().isValid, true);
			assertSame((await store.submit()).outcome, 'passed');
			assertEqual(before.errors, {});
		},
	},
	{
		rule: 'server errors tied to a submission',
		name: 'an error for a path no field declares shows at the form, with its type, params and message',
		async run(createStore) {
			const store = createStore(fixture().options);
			const answer = await passedSubmission(store);
			answer.setServerErrors({
				ghost: { type: 'unknown_field', params: { field: 'ghost' }, message: 'No such field' },
				'address.nowhere': [{ type: 'also_unknown' }],
				[FORM_ROOT]: { message: 'Try later' },
				name: { type: 'taken' },
				'contacts.1': { type: 'row_error' },
			});
			assertEqual(Object.keys(errorsOf(store)).toSorted(), [FORM_ROOT, 'contacts.1', 'name']);
			assertEqual(errorsOf(store)[FORM_ROOT].all, [
				{ type: 'server', source: 'server', message: 'Try later' },
				{
					type: 'unknown_field',
					source: 'server',
					params: { field: 'ghost' },
					message: 'No such field',
				},
				{ type: 'also_unknown', source: 'server' },
			]);

			const alone = await passedSubmission(store);
			alone.setServerErrors({ ghost: { type: 'unknown_field' } });
			assertEqual(Object.keys(errorsOf(store)), [FORM_ROOT]);
			assertSame(errorsOf(store)[FORM_ROOT].type, 'unknown_field');
		},
	},
];

/** Every rule of the contract, for a test that checks a deliberately broken store fails the rule it breaks. */
export const formStateContainerCases: readonly FormStateContainerCase[] = cases;

/**
 * The two functions of a test runner the conformance suite registers its cases with.
 *
 * @remarks
 * Structural, so the `describe` and `test` of Vitest, Jest, Bun test and `node:test` satisfy it as they are:
 * `formStateContainerConformance(createStore, { describe, test })`.
 */
export interface ConformanceRunner {
	describe(name: string, register: () => void): void;
	test(name: string, run: () => void | Promise<void>): void;
}

/**
 * Registers the internal form store contract as tests of `runner` against the store `createStore` builds.
 *
 * @remarks
 * Call it from a test file, like `rendererConformance`. A fresh store is built for each test. The suite uses no
 * test runner itself, so any runner with `describe` and `test` works, in Node or in a browser.
 */
export function formStateContainerConformance(createStore: FormStateContainerFactory, runner: ConformanceRunner): void {
	runner.describe('form state container conformance', () => {
		for (const rule of new Set(cases.map((entry) => entry.rule))) {
			runner.describe(rule, () => {
				for (const entry of cases.filter((candidate) => candidate.rule === rule)) {
					runner.test(entry.name, () => entry.run(createStore));
				}
			});
		}
	});
}

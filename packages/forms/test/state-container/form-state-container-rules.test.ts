import { describe, expect, test } from 'vitest';
import { formStateContainerCases } from '../../../../test-utils/form-state-container-conformance';
import { isPlainObject } from '@/lib/is-plain-object';
import { createFormStateContainer } from '@/state-container/create-form-state-container';
import {
	FORM_ROOT,
	type FormStateContainer,
	type FormStateContainerFactory,
	type FormStateSnapshot,
} from '@/state-container/types';

const withOverrides =
	(
		overrides: (
			inner: FormStateContainer,
			options: Parameters<FormStateContainerFactory>[0],
		) => Partial<FormStateContainer>,
	): FormStateContainerFactory =>
	(options) => {
		const inner = createFormStateContainer(options);
		return { ...inner, ...overrides(inner, options) };
	};

/** Rebuilds `getSnapshot` and `getServerSnapshot` from the inner snapshot, once per inner snapshot. */
const withSnapshot = (change: (snapshot: FormStateSnapshot) => FormStateSnapshot): FormStateContainerFactory =>
	withOverrides((inner) => {
		const cache = new WeakMap<FormStateSnapshot, FormStateSnapshot>();
		const view = (snapshot: FormStateSnapshot) => {
			let changed = cache.get(snapshot);
			if (!changed) cache.set(snapshot, (changed = change(snapshot)));
			return changed;
		};
		return {
			getSnapshot: () => view(inner.getSnapshot()),
			getServerSnapshot: () => view(inner.getServerSnapshot()),
		};
	});

const thaw = <T>(value: T): T =>
	Array.isArray(value)
		? (value.map(thaw) as T)
		: isPlainObject(value)
			? (Object.fromEntries(Object.entries(value).map(([key, child]) => [key, thaw(child)])) as T)
			: value;

/**
 * Each entry is a store that breaks one rule of the contract, and the cases that must notice.
 *
 * @remarks
 * A suite that every store passes proves nothing, so the conformance cases are pointed at stores
 * written to fail them.
 */
const brokenStores: Array<{ name: string; create: FormStateContainerFactory; caught: string[] }> = [
	{
		name: 'returns a new snapshot on every read',
		create: withOverrides((inner) => ({ getSnapshot: () => ({ ...inner.getSnapshot() }) })),
		caught: ['returns the same snapshot until something changes, and notifies once per change'],
	},
	{
		name: 'lets the server snapshot follow the store',
		create: withOverrides((inner) => ({ getServerSnapshot: () => inner.getSnapshot() })),
		caught: ['keeps one server snapshot for hydration, whatever happens to the store'],
	},
	{
		name: 'hands out snapshots that can be mutated',
		create: withSnapshot((snapshot) => ({
			...snapshot,
			values: thaw(snapshot.values),
			errors: { ...snapshot.errors },
		})),
		caught: ['freezes snapshots and does not alias the values it was given'],
	},
	{
		name: 'copies every branch into each new snapshot',
		create: withSnapshot((snapshot) =>
			Object.freeze({ ...snapshot, values: Object.freeze(thaw(snapshot.values)) }),
		),
		caught: ['keeps the reference of every branch a command did not change'],
	},
	{
		name: 'copies opaque arrays',
		create: withOverrides((inner) => ({
			setValue: (path, value) => inner.setValue(path, Array.isArray(value) ? [...value] : value),
		})),
		caught: ['stores and compares opaque values, such as File arrays, by reference'],
	},
	{
		name: 'merges a branch into the existing one',
		create: withOverrides((inner) => ({
			setValue: (path, value) => {
				const current = inner.getValue(path);
				inner.setValue(path, isPlainObject(current) && isPlainObject(value) ? { ...current, ...value } : value);
			},
		})),
		caught: ['setValue replaces the whole branch rather than merging into it'],
	},
	{
		name: 'validates on every change whatever the mode',
		create: withOverrides((inner) => ({
			setValue: (path, value) => {
				inner.setValue(path, value);
				void inner.validate([path]);
			},
		})),
		caught: ['with onSubmit nothing validates until validate is called'],
	},
	{
		name: 'validates on blur whatever the mode',
		create: withOverrides((inner) => ({
			blur: (path) => {
				inner.blur(path);
				void inner.validate([path]);
			},
		})),
		caught: ['with onChange a change validates and a blur alone does not'],
	},
	{
		name: 're-validates every path once any check has failed',
		create: (options) => {
			const inner = createFormStateContainer(options);
			let failed = false;
			return {
				...inner,
				validate: async (paths) => {
					const valid = await inner.validate(paths);
					if (!valid) failed = true;
					return valid;
				},
				setValue: (path, value) => {
					inner.setValue(path, value);
					if (failed) void inner.validate([path]);
				},
			};
		},
		caught: ['a failed check of some paths does not turn on re-validation for the others'],
	},
	{
		name: 'never records the errors of validate',
		create: withOverrides((inner) => ({ validate: (paths) => inner.checkValidity(paths) })),
		caught: ['with onSubmit nothing validates until validate is called'],
	},
	{
		name: 'writes errors from checkValidity',
		create: withOverrides((inner) => ({ checkValidity: (paths) => inner.validate(paths) })),
		caught: ['checkValidity reports validity and changes nothing, not even for subscribers'],
	},
	{
		name: 'touches a path when it changes',
		create: withOverrides((inner) => ({
			setValue: (path, value) => {
				inner.setValue(path, value);
				inner.blur(path);
			},
		})),
		caught: ['touched is set by a blur, not by a change, and cleared by reset'],
	},
	{
		name: 'shows the error of a container or of the form on every field below it',
		create: withOverrides((inner) => ({
			getFieldState: (path) => {
				const state = inner.getFieldState(path);
				const around = Object.keys(inner.getSnapshot().errors).find(
					(key) => key === FORM_ROOT || path.startsWith(`${key}.`),
				);
				const error = state.error ?? (around === undefined ? undefined : inner.getSnapshot().errors[around]);
				return { ...state, error, invalid: error !== undefined };
			},
		})),
		caught: [
			'an error is never inherited: a container and a row inside it can both have one',
			'an error about the form is its own entry and is no field error',
		],
	},
	{
		name: 'reports a field untouched however it was blurred',
		create: withOverrides((inner) => ({
			getFieldState: (path) => ({ ...inner.getFieldState(path), isTouched: false }),
		})),
		caught: ['getFieldState reports error, touched and dirty for a path'],
	},
	{
		name: 'never reports dirty fields',
		create: withSnapshot((snapshot) => ({ ...snapshot, dirty: {} })),
		caught: [
			'dirty follows the difference from the defaults, and appending a row does not make the rows before it dirty',
		],
	},
	{
		name: 'swaps row values without the state that belongs to them',
		create: withOverrides((inner) => ({
			fieldArray: (path) => ({
				...inner.fieldArray(path),
				swap: (indexA, indexB) => {
					const rows = [...(inner.getValue(path) as unknown[])];
					[rows[indexA], rows[indexB]] = [rows[indexB], rows[indexA]];
					inner.setValue(path, rows);
				},
			}),
		})),
		caught: ['swap moves rows with their ids, errors and touched state in one update'],
	},
	{
		name: 'ignores what the platform reports about a control',
		create: withOverrides(() => ({ setNativeValidity: () => undefined })),
		caught: [
			'native validity is an input to validation: it shows with the timing of validation, and notifies nobody alone',
			'lists the server, then each failed rule in rule order, then the native fact, and shows the first',
		],
	},
	{
		name: 'keeps only the first failed rule of a field',
		create: withOverrides((inner) => ({
			getSnapshot: () => {
				const snapshot = inner.getSnapshot();
				return {
					...snapshot,
					errors: Object.fromEntries(
						Object.entries(snapshot.errors).map(([path, error]) => [
							path,
							{ ...error, all: error.all.slice(0, 1) },
						]),
					),
				};
			},
		})),
		caught: ['lists the server, then each failed rule in rule order, then the native fact, and shows the first'],
	},
	{
		name: 'clears and rewrites a source on every write, even an identical one',
		create: withOverrides((inner) => ({
			setErrors: (source, errors) => {
				inner.setErrors(source, {});
				inner.setErrors(source, errors);
			},
		})),
		caught: ['identical errors change nothing and keep their objects, and a changed one replaces only its own'],
	},
];

describe('form state container conformance cases', () => {
	test.each(brokenStores)('a store that $name fails the matching case', async ({ create, caught }) => {
		for (const name of caught) {
			const entry = formStateContainerCases.find((candidate) => candidate.name === name);
			expect(entry, `no case named "${name}"`).toBeDefined();
			const failure: unknown = await Promise.resolve()
				.then(() => entry!.run(create))
				.then(
					() => undefined,
					(error: unknown) => error,
				);
			expect((failure as Error | undefined)?.name, `"${name}" did not fail`).toBe('AssertionError');
		}
	});

	test('every rule is exercised by a broken store', () => {
		const rules = new Set(formStateContainerCases.map(({ rule }) => rule));
		const caughtRules = new Set(
			brokenStores.flatMap(({ caught }) =>
				caught.map((name) => formStateContainerCases.find((entry) => entry.name === name)?.rule),
			),
		);
		const coveredElsewhere = new Set(['stale async results']);
		expect([...rules].filter((rule) => !caughtRules.has(rule) && !coveredElsewhere.has(rule))).toEqual([]);
	});
});

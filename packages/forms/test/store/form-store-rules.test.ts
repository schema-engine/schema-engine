import { describe, expect, test } from 'vitest';
import { formStoreCases } from '../../../../test-utils/form-store-conformance';
import { validateFormValues } from '@/engine/value-validation';
import { createDebounceScope } from '@/lib/debounce';
import { isPlainObject } from '@/lib/is-plain-object';
import { flattenErrors } from '@/store/field-state';
import { createFormStore } from '@/store/create-form-store';
import type { FormStore, FormStoreFactory, FormStoreSnapshot } from '@/store/types';

const withOverrides =
	(overrides: (inner: FormStore, options: Parameters<FormStoreFactory>[0]) => Partial<FormStore>): FormStoreFactory =>
	(options) => {
		const inner = createFormStore(options);
		return { ...inner, ...overrides(inner, options) };
	};

/** Rebuilds `getSnapshot` and `getServerSnapshot` from the inner snapshot, once per inner snapshot. */
const withSnapshot = (change: (snapshot: FormStoreSnapshot) => FormStoreSnapshot): FormStoreFactory =>
	withOverrides((inner) => {
		const cache = new WeakMap<FormStoreSnapshot, FormStoreSnapshot>();
		const view = (snapshot: FormStoreSnapshot) => {
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
const brokenStores: Array<{ name: string; create: FormStoreFactory; caught: string[] }> = [
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
		create: withOverrides((inner) => ({
			setValue: (path, value) => {
				inner.setValue(path, value);
				if (inner.getSnapshot().checkFailed) void inner.validate([path]);
			},
		})),
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
		name: 'never reports dirty fields',
		create: withSnapshot((snapshot) => ({ ...snapshot, dirty: {} })),
		caught: ['dirty follows the difference from the defaults, up through the containers'],
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
		name: 'lets the oldest error source win',
		create: (options) => {
			const inner = createFormStore(options);
			const sources = new Map<string, Parameters<FormStore['setErrors']>[1]>();
			return {
				...inner,
				setErrors(source, errors) {
					sources.set(source, errors);
					inner.setErrors(source, errors);
					for (const [other, known] of sources) if (other !== source) inner.setErrors(other, known);
				},
			};
		},
		caught: ['an explicit source beats validation, and the source set most recently beats the others'],
	},
	{
		name: 'applies async results whatever happened since',
		create: withOverrides((inner, options) => ({
			validate: async (paths) => {
				const errors = flattenErrors(
					await validateFormValues({
						elements: options.elements,
						registry: options.registry,
						values: inner.getSnapshot().values,
						names: paths,
						debounceScope: createDebounceScope(),
					}),
				);
				inner.setErrors('late', errors);
				return Object.keys(errors).length === 0;
			},
		})),
		caught: [
			'drops a result that arrives after a reset',
			'drops a result for rows that moved while it was running',
			'drops a result for a path whose value was written while it was running',
		],
	},
];

describe('form store conformance cases', () => {
	test('every rule has a case the reference store passes', async () => {
		for (const entry of formStoreCases) await entry.run(createFormStore);
	});

	test.each(brokenStores)('a store that $name fails the matching case', async ({ create, caught }) => {
		for (const name of caught) {
			const entry = formStoreCases.find((candidate) => candidate.name === name);
			expect(entry, `no case named "${name}"`).toBeDefined();
			await expect(Promise.resolve().then(() => entry!.run(create))).rejects.toThrow();
		}
	});

	test('every rule is exercised by a broken store', () => {
		const rules = new Set(formStoreCases.map(({ rule }) => rule));
		const caughtRules = new Set(
			brokenStores.flatMap(({ caught }) =>
				caught.map((name) => formStoreCases.find((entry) => entry.name === name)?.rule),
			),
		);
		expect([...rules].filter((rule) => !caughtRules.has(rule))).toEqual([]);
	});
});

import { describe, expect, test } from 'vitest';
import { containerOptions, formStateContainerCases } from '../../../../test-utils/form-state-container-conformance';
import { isPlainObject } from '@/lib/is-plain-object';
import { createFormStateContainer } from '@/state-container/create-form-state-container';
import {
	FORM_ROOT,
	type FormStateContainer,
	type FormStateContainerFactory,
	type FormStateIssue,
	type FormStateSnapshot,
	type FormSubmitResult,
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

/** Every path of a nested value tree, containers and leaves, as the snapshot's flat maps name them. */
const valuePaths = (value: unknown, prefix = ''): string[] =>
	Array.isArray(value) || isPlainObject(value)
		? Object.entries(value).flatMap(([key, child]) => {
				const path = prefix ? `${prefix}.${key}` : key;
				return [path, ...valuePaths(child, path)];
			})
		: [];

/**
 * Each entry is a store that breaks one rule of the contract, and the cases that must notice.
 *
 * @remarks
 * A suite that every store passes proves nothing, so the conformance cases are pointed at stores
 * written to fail them.
 */
const brokenStores: Array<{ name: string; create: FormStateContainerFactory; caught: string[] }> = [
	{
		name: 'ignores the snapshot it is given and starts from the defaults',
		create: (options) => createFormStateContainer({ ...options, snapshot: undefined }),
		caught: [
			'hydrates from the serialized snapshot of another container: its values and ids after row operations, and fresh ids for new rows',
		],
	},
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
		create: withOverrides((inner) => ({ validate: () => inner.checkValidity() })),
		caught: ['with onSubmit nothing validates until validate is called'],
	},
	{
		name: 'writes errors from checkValidity',
		create: withOverrides((inner) => ({ checkValidity: () => inner.validate() })),
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
		create: withSnapshot((snapshot) => {
			const errors = { ...snapshot.errors };
			for (const path of valuePaths(snapshot.values)) {
				const around = Object.keys(snapshot.errors).find(
					(key) => key === FORM_ROOT || path.startsWith(`${key}.`),
				);
				if (around !== undefined && !(path in errors)) errors[path] = snapshot.errors[around];
			}
			return { ...snapshot, errors };
		}),
		caught: [
			'an error is never inherited: a container and a row inside it can both have one',
			'an error about the form is its own entry and is no field error',
		],
	},
	{
		name: 'reports a field untouched however it was blurred',
		create: withSnapshot((snapshot) => ({ ...snapshot, touched: {} })),
		caught: ['selectFieldState reports error, touched and dirty for a path'],
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
		create: withOverrides(() => ({ reportNative: () => undefined })),
		caught: [
			'native validity is an input to validation: it shows with the timing of validation, and notifies nobody alone',
			'lists the server, then each failed rule in rule order, then the native fact, and shows the first',
		],
	},
	{
		name: 'treats each report as the whole truth, withdrawing the facts it leaves out',
		create: withOverrides((inner) => {
			const held = new Set<string>();
			return {
				reportNative: (facts) => {
					const withdrawn = Object.fromEntries([...held].map((path) => [path, null]));
					held.clear();
					for (const [path, fact] of Object.entries(facts)) if (fact !== null) held.add(path);
					inner.reportNative({ ...withdrawn, ...facts });
				},
			};
		}),
		caught: [
			'a fact stays held until its control withdraws it: every held fact counts for validate and checkValidity',
		],
	},
	{
		name: 'skips a reserved path instead of rejecting the call',
		create: withOverrides((inner) => ({
			reportNative: (facts) =>
				inner.reportNative(
					Object.fromEntries(Object.entries(facts).filter(([path]) => !path.startsWith('__'))),
				),
		})),
		caught: [
			'a reserved path rejects the whole reportNative call before any write, and every reserved segment is named',
			'refuses a reserved path and a row that does not exist, and writes nothing',
		],
	},
	{
		name: 'writes the facts that come before a reserved path',
		create: withOverrides((inner) => ({
			reportNative: (facts) => {
				for (const [path, fact] of Object.entries(facts)) inner.reportNative({ [path]: fact });
			},
		})),
		caught: [
			'a reserved path rejects the whole reportNative call before any write, and every reserved segment is named',
		],
	},
	{
		name: 'marks a path touched when its control reports',
		create: withOverrides((inner) => ({
			reportNative: (facts) => {
				inner.reportNative(facts);
				for (const path of Object.keys(facts)) inner.blur(path);
			},
		})),
		caught: [
			'reportNative binds facts to the values held now, validates only paths already checked, and is no user change',
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
			submit: async () => {
				const result = await inner.submit();
				if (result.outcome !== 'passed') return result;
				return {
					...result,
					setServerErrors: (errors) => {
						result.setServerErrors({});
						result.setServerErrors(errors);
					},
				};
			},
		})),
		caught: ['identical errors change nothing and keep their objects, and a changed one replaces only its own'],
	},
	{
		name: 'reports nothing as pending',
		create: withSnapshot((snapshot) => ({ ...snapshot, validating: {} })),
		caught: ['lists the paths a check is running for, moves with a row, and drops a path a later check took over'],
	},
	{
		name: 'answers through the latest submission, whichever one the answer is for',
		create: withOverrides((inner) => {
			let latest: Extract<FormSubmitResult, { outcome: 'passed' }> | undefined;
			return {
				submit: async () => {
					const result = await inner.submit();
					if (result.outcome !== 'passed') return result;
					latest = result;
					return { ...result, setServerErrors: (errors) => latest?.setServerErrors(errors) };
				},
			};
		}),
		caught: ['an answer to a submission from before a reset, or to a superseded one, is ignored'],
	},
	{
		name: 'hands back the values it had before the validation ended',
		create: withOverrides((inner) => ({
			submit: async () => {
				const before = inner.getSnapshot().values;
				const result = await inner.submit();
				return result.outcome === 'passed' ? { ...result, values: before } : result;
			},
		})),
		caught: [
			'an edit during validation followed by a passing retry submits the edited values, and the server answer for them applies',
		],
	},
	{
		name: 'never ends a submission overtaken',
		create: withOverrides((inner) => ({
			submit: async () => {
				const result = await inner.submit();
				return result.outcome === 'overtaken' ? { outcome: 'invalid' } : result;
			},
		})),
		caught: ['a submission ends passed, invalid, or overtaken'],
	},
	{
		name: 'never marks a path touched when it is blurred',
		create: withOverrides(() => ({ blur: () => undefined })),
		caught: [
			'blur marks the path touched in one notification and validates by mode; written first, the value ends as one command would leave it',
		],
	},
	{
		name: 'writes past the end of an array',
		create: withOverrides((inner) => ({
			setValue: (path, value) => {
				try {
					inner.setValue(path, value);
				} catch {
					return undefined;
				}
			},
		})),
		caught: [
			'setValue and blur refuse a row the array does not have, and a reserved segment, instead of leaving holes',
		],
	},
	{
		name: 'validates fields whatever their constraints and disabled state',
		create: (options) =>
			createFormStateContainer(
				containerOptions({
					registry: options.registry,
					defaults: options.defaults,
					snapshot: options.snapshot,
					...options.config,
					elements: options.config.steps
						.flatMap((step) => step.elements)
						.map((element) => ({ ...element, constraints: undefined, disabled: undefined })),
				}),
			),
		caught: [
			'a field a constraint hides takes no part: it does not block, count or show, however it was recorded',
			'disabled fields, authored or by a constraint, and everything inside an excluded container, are excluded; an inactive step is not',
		],
	},
	{
		name: 'drops the identity of an issue',
		create: withSnapshot((snapshot) => ({
			...snapshot,
			errors: Object.fromEntries(
				Object.entries(snapshot.errors).map(([path, error]) => {
					const strip = ({ ruleId: _id, params: _params, ...rest }: FormStateIssue) => rest as FormStateIssue;
					return [path, { ...strip(error), all: error.all.map(strip) }];
				}),
			),
		})),
		caught: [
			'every rule reports its type, id and params, two rules of one type stay apart, and a rule reports once',
		],
	},
	{
		name: 'swallows a rule that could not run',
		create: withOverrides((inner) => ({
			validate: (paths) => inner.validate(paths).catch(() => false),
			checkValidity: () => inner.checkValidity().catch(() => false),
		})),
		caught: [
			'a rule that throws is no field error: validate and checkValidity reject naming it, an automatic check logs it, the others still report',
			'a failure says why a rule did not run: the service was unavailable, or the rule threw',
		],
	},
	{
		name: 'counts a warning as an error',
		create: withSnapshot((snapshot) => ({
			...snapshot,
			errors: { ...snapshot.errors, ...snapshot.warnings },
			isValid: Object.keys(snapshot.warnings).length === 0 && snapshot.isValid,
		})),
		caught: [
			'a rule with severity warning reports advice that never blocks, with the shape and timing of an error',
		],
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
		const coveredElsewhere = new Set(['stale async results', 'freshness']);
		expect([...rules].filter((rule) => !caughtRules.has(rule) && !coveredElsewhere.has(rule))).toEqual([]);
	});
});

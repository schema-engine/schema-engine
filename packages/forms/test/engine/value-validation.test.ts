import { describe, expect, test, vi } from 'vitest';
import * as z from 'zod/mini';
import { normalizeContainerFixture } from '../lib/container-fixture';
import { createDefaultValidationRegistry } from '@/schemas/validation';
import type { ElementConfig } from '@/schemas/field-config';
import { markNormalizedElementConfig } from '@/lib/normalized-form-config';
import { getValueAtPath } from '@/lib/path-values';
import { createDebounceScope } from '@/lib/debounce';
import type { NormalizedElementConfig } from '@/lib/normalized-form-config';
import {
	collectStepFieldPaths,
	effectiveRulesFor,
	isPathExcluded,
	resolveParticipation,
	validateFieldValue,
	validateFormValues,
	type ValidationElementTree,
} from '@/engine/value-validation';

/** The issue of a failed rule. */
const found = (type: string, message: string | undefined, extra: Record<string, unknown> = {}) => ({
	type,
	...(message === undefined ? {} : { message }),
	severity: 'error',
	...extra,
});

/** What a validation found, without the rules that could not run. */
const issuesOf = async (input: Parameters<typeof validateFormValues>[0]) => {
	const { issues, failures } = await validateFormValues(input);
	expect(failures).toEqual({});
	return issues;
};

const registry = createDefaultValidationRegistry();

function normalizeElement(element: ElementConfig): NormalizedElementConfig {
	return markNormalizedElementConfig(element);
}

function normalizeElements(elements: ElementConfig[]): NormalizedElementConfig[] {
	return elements.map(normalizeElement);
}

describe('collectStepFieldPaths', () => {
	test('walks fieldsets and expands each array row', () => {
		const step = {
			elements: normalizeElements([
				{
					$type: 'fieldset',
					name: 'address',
					elements: [{ $type: 'input', name: 'street' }],
				},
				{
					$type: 'arrayElements',
					name: 'contacts',
					elements: [{ $type: 'input', name: 'email' }],
				},
			]),
		};

		expect(
			collectStepFieldPaths(step, {
				address: { street: '1 Main' },
				contacts: [{ email: 'a@example.com' }, { email: 'b@example.com' }],
			}),
		).toEqual(['address', 'address.street', 'contacts', 'contacts.0.email', 'contacts.1.email']);
	});

	test('expands scalar array child paths for validation', async () => {
		const element = normalizeContainerFixture({
			$type: 'arrayElements',
			name: 'tags',
			elements: [{ $type: 'input', name: 'value', rules: [{ $type: 'required', message: 'Tag is required' }] }],
		});
		const values = { tags: ['', 'valid'] };
		const step = { elements: [element] };

		expect(collectStepFieldPaths(step, values)).toEqual(['tags', 'tags.0', 'tags.1']);
		await expect(
			issuesOf({ steps: [{ elements: [element] }], values, registry, debounceScope: createDebounceScope() }),
		).resolves.toEqual({
			'tags.0': [found('required', 'Tag is required')],
		});
	});

	test('expands sparse scalar array slots so required rules can validate them', async () => {
		const element = normalizeContainerFixture({
			$type: 'arrayElements',
			name: 'tags',
			elements: [{ $type: 'input', name: 'ignored', rules: [{ $type: 'required', message: 'Tag is required' }] }],
		});
		const tags: undefined[] = [];
		tags.length = 1;
		const values = { tags };

		expect(collectStepFieldPaths({ elements: [element] }, values)).toEqual(['tags', 'tags.0']);
		await expect(
			issuesOf({ steps: [{ elements: [element] }], values, registry, debounceScope: createDebounceScope() }),
		).resolves.toEqual({
			'tags.0': [found('required', 'Tag is required')],
		});
	});

	test('expands scalar array child paths inside nested object arrays', async () => {
		const element = normalizeContainerFixture({
			$type: 'arrayElements',
			name: 'groups',
			elements: [
				{
					$type: 'arrayElements',
					name: 'tags',
					elements: [
						{ $type: 'input', name: 'value', rules: [{ $type: 'required', message: 'Tag is required' }] },
					],
				},
				{ $type: 'input', name: 'label' },
			],
		});
		const values = { groups: [{ tags: [''] }] };

		expect(collectStepFieldPaths({ elements: [element] }, values)).toContain('groups.0.tags.0');
		await expect(
			issuesOf({ steps: [{ elements: [element] }], values, registry, debounceScope: createDebounceScope() }),
		).resolves.toEqual({
			'groups.0.tags.0': [found('required', 'Tag is required')],
		});
	});

	test('expands each nested scalar array boundary before validating its item', async () => {
		const element = normalizeContainerFixture({
			$type: 'arrayElements',
			name: 'groups',
			elements: [
				{
					$type: 'arrayElements',
					name: 'ignored',
					elements: [
						{
							$type: 'input',
							name: 'ignored',
							rules: [{ $type: 'required', message: 'Tag is required' }],
						},
					],
				},
			],
		});
		const values = { groups: [['']] };

		expect(collectStepFieldPaths({ elements: [element] }, values)).toEqual(['groups', 'groups.0', 'groups.0.0']);
		await expect(
			issuesOf({ steps: [{ elements: [element] }], values, registry, debounceScope: createDebounceScope() }),
		).resolves.toEqual({
			'groups.0.0': [found('required', 'Tag is required')],
		});
	});
});

describe('effectiveRulesFor', () => {
	const field = normalizeElement({
		$type: 'input',
		name: 'taxId',
		constraints: [{ field: 'accountType', operator: 'equals', value: 'business', action: 'require' }],
	});

	test('adds required while its constraint holds and removes the synthetic rule when it does not', () => {
		const requiredRules = effectiveRulesFor({
			element: field,
			fieldPath: 'taxId',
			values: { accountType: 'business' },
			registry,
		});
		const optionalRules = effectiveRulesFor({
			element: field,
			fieldPath: 'taxId',
			values: { accountType: 'personal' },
			registry,
		});

		expect(requiredRules).toEqual([{ $type: 'required' }]);
		expect(optionalRules).toEqual([]);
	});
});

describe('validateFieldValue', () => {
	test('validates conditional rules with the rendered field path', async () => {
		const result = await validateFieldValue({
			element: normalizeElement({
				$type: 'input',
				name: 'taxId',
				constraints: [{ field: 'accountType', operator: 'equals', value: 'business', action: 'require' }],
			}),
			value: '',
			values: { accountType: 'business', taxId: '' },
			fieldPath: 'taxId',
			registry,
			debounceScope: createDebounceScope(),
		});

		expect(result).toEqual({ issues: [found('required', undefined)], failures: [], superseded: false });
	});

	test('a superseded async validation never passes submission', async () => {
		vi.useFakeTimers();
		const fetchSpy = vi
			.spyOn(globalThis, 'fetch')
			.mockImplementation(async () => new Response(JSON.stringify({ valid: true }), { status: 200 }));
		const element = normalizeElement({
			$type: 'input',
			name: 'email',
			rules: [{ $type: 'async', url: '/api/check', debounce: 300, disableCache: true }],
		});
		const debounceScope = createDebounceScope();

		try {
			const first = validateFieldValue({
				element,
				value: 'first@example.com',
				values: { email: 'first@example.com' },
				fieldPath: 'email',
				registry,
				debounceScope,
			});
			await vi.advanceTimersByTimeAsync(100);
			const second = validateFieldValue({
				element,
				value: 'second@example.com',
				values: { email: 'second@example.com' },
				fieldPath: 'email',
				registry,
				debounceScope,
			});

			expect(await first).toEqual({ issues: [], failures: [], superseded: true });
			await vi.advanceTimersByTimeAsync(300);
			expect(await second).toEqual({ issues: [], failures: [], superseded: false });

			expect(fetchSpy).toHaveBeenCalledOnce();
			const [, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
			expect(JSON.parse(init.body as string)).toEqual({ value: 'second@example.com' });
		} finally {
			fetchSpy.mockRestore();
			vi.useRealTimers();
		}
	});
});

describe('validateFormValues', () => {
	const elements = normalizeElements([
		{
			$type: 'fieldset',
			name: 'address',
			elements: [
				{ $type: 'input', name: 'street', rules: [{ $type: 'required', message: 'Street is required' }] },
			],
		},
		{ $type: 'input', name: 'email', rules: [{ $type: 'required', message: 'Email is required' }] },
	]);

	test('returns nested address errors and validates only requested names', async () => {
		const errors = await issuesOf({
			steps: [{ elements }],
			values: { address: { street: '' }, email: '' },
			registry,
			debounceScope: createDebounceScope(),
			names: ['address.street'],
		});

		expect(errors).toEqual({ 'address.street': [found('required', 'Street is required')] });
	});

	test('requires every field inside a container while its require constraint holds', async () => {
		const company = normalizeElement({
			$type: 'fieldset',
			name: 'company',
			constraints: [{ field: 'kind', operator: 'equals', value: 'business', action: 'require' }],
			elements: [
				{ $type: 'input', name: 'vat' },
				{ $type: 'fieldset', name: 'office', elements: [{ $type: 'input', name: 'street' }] },
			],
		});
		const validate = (kind: string) =>
			issuesOf({
				steps: [{ elements: [{ $type: 'input', name: 'kind' }, company] }],
				values: { kind, company: { vat: '', office: { street: '' } } },
				registry,
				debounceScope: createDebounceScope(),
			});

		expect(Object.keys(await validate('business')).toSorted()).toEqual(['company.office.street', 'company.vat']);
		expect(await validate('personal')).toEqual({});
	});

	test("does not pass a container's own required rule to the fields inside it", async () => {
		const company = normalizeElement({
			$type: 'fieldset',
			name: 'company',
			rules: [{ $type: 'required' }],
			elements: [{ $type: 'input', name: 'vat' }],
		});
		const errors = await issuesOf({
			steps: [{ elements: [company] }],
			values: { company: { vat: '' } },
			registry,
			debounceScope: createDebounceScope(),
		});

		expect(getValueAtPath(errors, 'company.vat')).toBeUndefined();
	});

	test('validates minItems on an empty array-valued field', async () => {
		const languages = normalizeElement({
			$type: 'input',
			name: 'languages',
			rules: [{ $type: 'minItems', value: 1, message: 'Select a language' }],
		});
		const errors = await issuesOf({
			steps: [{ elements: [languages] }],
			values: { languages: [] },
			registry,
			debounceScope: createDebounceScope(),
		});

		expect(errors.languages).toEqual([found('minItems', 'Select a language', { params: { minItems: 1 } })]);
	});

	test('a rule that throws is a failure to run, and does not hide the issues of the others', async () => {
		const throwing = createDefaultValidationRegistry([
			{
				$type: 'boom',
				schema: z.object({ $type: z.literal('boom') }),
				metadata: { name: 'Boom' },
				category: 'generic',
				handler: () =>
					z.any().check(
						z.refine(() => {
							throw new Error('boom');
						}),
					),
			} as never,
		]);
		const result = await validateFieldValue({
			element: normalizeElement({
				$type: 'input',
				name: 'code',
				rules: [{ $type: 'minLength', value: 5, message: 'Too short' }, { $type: 'boom' } as never],
			}),
			value: 'a',
			values: { code: 'a' },
			fieldPath: 'code',
			registry: throwing,
			debounceScope: createDebounceScope(),
		});

		expect(result.issues).toEqual([found('minLength', 'Too short', { params: { minLength: 5 } })]);
		expect(result.failures).toHaveLength(1);
		expect(result.failures[0]).toMatchObject({ name: 'FormValidationFailure', path: 'code', ruleType: 'boom' });
	});

	test('validates nothing for an empty list of names and everything when names are omitted', async () => {
		const field = normalizeElement({
			$type: 'input',
			name: 'email',
			rules: [{ $type: 'required', message: 'Email is required' }],
		});
		const input = { steps: [{ elements: [field] }], values: {}, registry, debounceScope: createDebounceScope() };

		expect(await issuesOf({ ...input, names: [] })).toEqual({});
		expect(Object.keys(await issuesOf(input))).toEqual(['email']);
	});

	test('reports every rule a field fails, in rule order, with the first as the error itself', async () => {
		const field = normalizeElement({
			$type: 'input',
			name: 'code',
			rules: [
				{ $type: 'minLength', value: 5, message: 'Too short' },
				{ $type: 'pattern', value: '^\\d+$', message: 'Digits only' },
			],
		});
		const errors = await issuesOf({
			steps: [{ elements: [field] }],
			values: { code: 'ab' },
			registry,
			debounceScope: createDebounceScope(),
		});

		expect(errors.code).toEqual([
			found('minLength', 'Too short', { params: { minLength: 5 } }),
			found('pattern', 'Digits only', { params: { pattern: '^\\d+$' } }),
		]);
	});

	test('reports a container and a row inside it that both fail, and matches names exactly on request', async () => {
		const contacts = normalizeContainerFixture({
			$type: 'arrayElements',
			name: 'contacts',
			rules: [{ $type: 'minItems', value: 2, message: 'Add two contacts' }],
			elements: [
				{ $type: 'input', name: 'email', rules: [{ $type: 'required', message: 'Email is required' }] },
				{ $type: 'input', name: 'label' },
			],
		});
		const input = {
			steps: [{ elements: [contacts] }],
			values: { contacts: [{}] },
			registry,
			debounceScope: createDebounceScope(),
		};

		expect(await issuesOf(input)).toEqual({
			contacts: [found('minItems', 'Add two contacts', { params: { minItems: 2 } })],
			'contacts.0.email': [found('required', 'Email is required')],
		});
		expect(await issuesOf({ ...input, names: ['contacts'], exactNames: true })).toEqual({
			contacts: [found('minItems', 'Add two contacts', { params: { minItems: 2 } })],
		});
	});

	test('validates a required array child when only one row omits its value', async () => {
		const contacts = normalizeElement({
			$type: 'arrayElements',
			name: 'contacts',
			elements: [{ $type: 'input', name: 'email', rules: [{ $type: 'required', message: 'Email is required' }] }],
		});
		const errors = await issuesOf({
			steps: [{ elements: [contacts] }],
			values: { contacts: [{ email: 'ada@example.com' }, { name: 'Grace' }, { email: undefined }] },
			registry,
			debounceScope: createDebounceScope(),
		});

		expect(errors['contacts.1.email']).toEqual([found('required', 'Email is required')]);
		expect(errors['contacts.2.email']).toEqual([found('required', 'Email is required')]);
	});

	test('validates a nested array container against its concrete row path', async () => {
		const contacts = normalizeElement({
			$type: 'arrayElements',
			name: 'contacts',
			elements: [
				{
					$type: 'arrayElements',
					name: 'phones',
					rules: [{ $type: 'minItems', value: 1 }],
					elements: [{ $type: 'input', name: 'number' }],
				},
			],
		});
		const errors = await issuesOf({
			steps: [{ elements: [contacts] }],
			values: { contacts: [{ phones: ['555'] }] },
			registry,
			debounceScope: createDebounceScope(),
		});

		expect(errors).toEqual({});
	});
});

const resolveExcludedPaths = (elements: ValidationElementTree, values: Record<string, unknown>) => [
	...resolveParticipation([{ elements }], values).excluded,
];

describe('resolveParticipation', () => {
	const elements = normalizeElements([
		{ $type: 'input', name: 'kind' },
		{
			$type: 'input',
			name: 'company',
			constraints: [{ field: 'kind', operator: 'equals', value: 'business', action: 'show' }],
		},
		{ $type: 'input', name: 'locked', disabled: true },
		{
			$type: 'arrayElements',
			name: 'contacts',
			elements: [
				{ $type: 'input', name: 'role' },
				{
					$type: 'input',
					name: 'fax',
					constraints: [{ field: 'role', operator: 'equals', value: 'office', action: 'hide' }],
				},
			],
		},
	]);

	test('lists the fields hidden or disabled by their config or a constraint, resolved per row', () => {
		const excluded = resolveExcludedPaths(elements, {
			kind: 'person',
			contacts: [{ role: 'office' }, { role: 'home' }],
		});

		expect(excluded.toSorted()).toEqual(['company', 'contacts.0.fax', 'locked']);
		expect(resolveExcludedPaths(elements, { kind: 'business', contacts: [] })).toEqual(['locked']);
	});

	test('leaves out a path inside an excluded container, which the container covers', () => {
		const grouped = normalizeElements([
			{
				$type: 'fieldset',
				name: 'extra',
				disabled: true,
				elements: [{ $type: 'input', name: 'note', disabled: true }],
			},
		]);

		expect(resolveExcludedPaths(grouped, { extra: { note: '' } })).toEqual(['extra']);
		expect(isPathExcluded(['extra'], 'extra.note')).toBe(true);
		expect(isPathExcluded(['extra'], 'extras')).toBe(false);
	});

	test('validateFormValues does not run the rules of an excluded path', async () => {
		const required = normalizeElements([
			{ $type: 'input', name: 'locked', disabled: true, rules: [{ $type: 'required' }] },
			{ $type: 'input', name: 'open', rules: [{ $type: 'required' }] },
		]);
		const { issues } = await validateFormValues({
			steps: [{ elements: required }],
			values: { locked: '', open: '' },
			registry,
			debounceScope: createDebounceScope(),
		});

		expect(Object.keys(issues)).toEqual(['open']);
	});
});

describe('rule issues', () => {
	test('carry the rule type, id, params and severity, and one issue comes from each failing rule', async () => {
		const result = await validateFieldValue({
			element: normalizeElement({
				$type: 'input',
				name: 'email',
				rules: [
					{ $type: 'email', id: 'email-format', message: 'Not an email', pattern: '@corp\\.com$' },
					{ $type: 'minLength', value: 30, severity: 'warning' },
				],
			}),
			value: 'a@b.c',
			values: { email: 'a@b.c' },
			fieldPath: 'email',
			registry,
			debounceScope: createDebounceScope(),
		});

		expect(result.issues).toEqual([
			{
				type: 'email',
				ruleId: 'email-format',
				params: { pattern: '@corp\\.com$' },
				message: 'Not an email',
				severity: 'error',
			},
			{ type: 'minLength', params: { minLength: 30 }, severity: 'warning' },
		]);
	});
});

describe('an array with one child', () => {
	const rows = (values: Record<string, unknown>, objectRows = false) => {
		const element = normalizeContainerFixture({
			$type: 'arrayElements',
			name: 'users',
			...(objectRows ? { initialValues: { name: '' } } : {}),
			elements: [{ $type: 'input', name: 'name', rules: [{ $type: 'required', message: 'Name is required' }] }],
		});
		return issuesOf({ steps: [{ elements: [element] }], values, registry, debounceScope: createDebounceScope() });
	};

	test('is validated at the field of each row when its rows are objects', async () => {
		expect(Object.keys(await rows({ users: [{ name: '' }, { name: 'Ada' }] }, true))).toEqual(['users.0.name']);
	});

	test('is validated at the row itself when its rows are scalars', async () => {
		expect(Object.keys(await rows({ users: ['', 'Ada'] }))).toEqual(['users.0']);
	});

	test('lists the same paths for the rows it holds', () => {
		const objects = normalizeContainerFixture({
			$type: 'arrayElements',
			name: 'users',
			initialValues: { name: '' },
			elements: [{ $type: 'input', name: 'name' }],
		});
		const scalars = normalizeContainerFixture({
			$type: 'arrayElements',
			name: 'users',
			elements: [{ $type: 'input', name: 'name' }],
		});

		expect(collectStepFieldPaths({ elements: [objects] }, { users: [{ name: 'a' }] })).toEqual([
			'users',
			'users.0.name',
		]);
		expect(collectStepFieldPaths({ elements: [scalars] }, { users: ['a'] })).toEqual(['users', 'users.0']);
	});

	test('keeps its configured rows whatever the values say: object rows given to a scalar array are not its rows', () => {
		const scalars = normalizeContainerFixture({
			$type: 'arrayElements',
			name: 'users',
			elements: [{ $type: 'input', name: 'name' }],
		});

		expect(collectStepFieldPaths({ elements: [scalars] }, { users: [{ name: 'a' }] })).toEqual([
			'users',
			'users.0',
		]);
	});
});

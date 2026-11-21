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
	validateFieldValue,
	validateFormValues,
} from '@/engine/value-validation';

/** The error a field with one failed rule has. */
const failure = (...messages: string[]) => ({
	type: 'validation',
	message: messages[0],
	all: messages.map((message) => ({ type: 'validation', message })),
});

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
			elements: [{ $type: 'input', name: 'value', rules: [{ type: 'required', message: 'Tag is required' }] }],
		});
		const values = { tags: ['', 'valid'] };
		const step = { elements: [element] };

		expect(collectStepFieldPaths(step, values)).toEqual(['tags', 'tags.0', 'tags.1']);
		await expect(
			validateFormValues({ elements: [element], values, registry, debounceScope: createDebounceScope() }),
		).resolves.toEqual({
			'tags.0': failure('Tag is required'),
		});
	});

	test('expands sparse scalar array slots so required rules can validate them', async () => {
		const element = normalizeContainerFixture({
			$type: 'arrayElements',
			name: 'tags',
			elements: [{ $type: 'input', name: 'ignored', rules: [{ type: 'required', message: 'Tag is required' }] }],
		});
		const tags: undefined[] = [];
		tags.length = 1;
		const values = { tags };

		expect(collectStepFieldPaths({ elements: [element] }, values)).toEqual(['tags', 'tags.0']);
		await expect(
			validateFormValues({ elements: [element], values, registry, debounceScope: createDebounceScope() }),
		).resolves.toEqual({
			'tags.0': failure('Tag is required'),
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
						{ $type: 'input', name: 'value', rules: [{ type: 'required', message: 'Tag is required' }] },
					],
				},
				{ $type: 'input', name: 'label' },
			],
		});
		const values = { groups: [{ tags: [''] }] };

		expect(collectStepFieldPaths({ elements: [element] }, values)).toContain('groups.0.tags.0');
		await expect(
			validateFormValues({ elements: [element], values, registry, debounceScope: createDebounceScope() }),
		).resolves.toEqual({
			'groups.0.tags.0': failure('Tag is required'),
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
							rules: [{ type: 'required', message: 'Tag is required' }],
						},
					],
				},
			],
		});
		const values = { groups: [['']] };

		expect(collectStepFieldPaths({ elements: [element] }, values)).toEqual(['groups', 'groups.0', 'groups.0.0']);
		await expect(
			validateFormValues({ elements: [element], values, registry, debounceScope: createDebounceScope() }),
		).resolves.toEqual({
			'groups.0.0': failure('Tag is required'),
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

		expect(requiredRules).toEqual([{ type: 'required' }]);
		expect(optionalRules).toEqual([]);
	});
});

describe('validateFieldValue', () => {
	test('validates conditional rules with the rendered field path', async () => {
		const message = await validateFieldValue({
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

		expect(message).toEqual(['Required']);
	});

	test('a superseded async validation never passes submission', async () => {
		vi.useFakeTimers();
		const fetchSpy = vi
			.spyOn(globalThis, 'fetch')
			.mockImplementation(async () => new Response(JSON.stringify({ valid: true }), { status: 200 }));
		const element = normalizeElement({
			$type: 'input',
			name: 'email',
			rules: [{ type: 'async', url: '/api/check', debounce: 300, disableCache: true }],
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

			await expect(first).resolves.toEqual(['Validation pending']);
			await vi.advanceTimersByTimeAsync(300);
			await expect(second).resolves.toEqual([]);

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
				{ $type: 'input', name: 'street', rules: [{ type: 'required', message: 'Street is required' }] },
			],
		},
		{ $type: 'input', name: 'email', rules: [{ type: 'required', message: 'Email is required' }] },
	]);

	test('returns nested address errors and validates only requested names', async () => {
		const errors = await validateFormValues({
			elements,
			values: { address: { street: '' }, email: '' },
			registry,
			debounceScope: createDebounceScope(),
			names: ['address.street'],
		});

		expect(errors).toEqual({ 'address.street': failure('Street is required') });
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
			validateFormValues({
				elements: [{ $type: 'input', name: 'kind' }, company],
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
			rules: [{ type: 'required' }],
			elements: [{ $type: 'input', name: 'vat' }],
		});
		const errors = await validateFormValues({
			elements: [company],
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
			rules: [{ type: 'minItems', value: 1, message: 'Select a language' }],
		});
		const errors = await validateFormValues({
			elements: [languages],
			values: { languages: [] },
			registry,
			debounceScope: createDebounceScope(),
		});

		expect(errors.languages).toEqual(failure('Select a language'));
	});

	test('a rule that throws does not hide the failures of the others', async () => {
		const throwing = createDefaultValidationRegistry([
			{
				$type: 'boom',
				schema: z.object({ type: z.literal('boom') }),
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
		const messages = await validateFieldValue({
			element: normalizeElement({
				$type: 'input',
				name: 'code',
				rules: [{ type: 'minLength', value: 5, message: 'Too short' }, { type: 'boom' } as never],
			}),
			value: 'a',
			values: { code: 'a' },
			fieldPath: 'code',
			registry: throwing,
			debounceScope: createDebounceScope(),
		});

		expect(messages).toEqual(['Too short', 'Validation failed']);
	});

	test('validates nothing for an empty list of names and everything when names are omitted', async () => {
		const field = normalizeElement({
			$type: 'input',
			name: 'email',
			rules: [{ type: 'required', message: 'Email is required' }],
		});
		const input = { elements: [field], values: {}, registry, debounceScope: createDebounceScope() };

		expect(await validateFormValues({ ...input, names: [] })).toEqual({});
		expect(Object.keys(await validateFormValues(input))).toEqual(['email']);
	});

	test('reports every rule a field fails, in rule order, with the first as the error itself', async () => {
		const field = normalizeElement({
			$type: 'input',
			name: 'code',
			rules: [
				{ type: 'minLength', value: 5, message: 'Too short' },
				{ type: 'pattern', value: '^\\d+$', message: 'Digits only' },
			],
		});
		const errors = await validateFormValues({
			elements: [field],
			values: { code: 'ab' },
			registry,
			debounceScope: createDebounceScope(),
		});

		expect(errors.code).toEqual(failure('Too short', 'Digits only'));
		expect(errors.code.all[0]).toMatchObject({ message: errors.code.message });
	});

	test('reports a container and a row inside it that both fail, and matches names exactly on request', async () => {
		const contacts = normalizeContainerFixture({
			$type: 'arrayElements',
			name: 'contacts',
			rules: [{ type: 'minItems', value: 2, message: 'Add two contacts' }],
			elements: [
				{ $type: 'input', name: 'email', rules: [{ type: 'required', message: 'Email is required' }] },
				{ $type: 'input', name: 'label' },
			],
		});
		const input = {
			elements: [contacts],
			values: { contacts: [{}] },
			registry,
			debounceScope: createDebounceScope(),
		};

		expect(await validateFormValues(input)).toEqual({
			contacts: failure('Add two contacts'),
			'contacts.0.email': failure('Email is required'),
		});
		expect(await validateFormValues({ ...input, names: ['contacts'], exactNames: true })).toEqual({
			contacts: failure('Add two contacts'),
		});
	});

	test('validates a required array child when only one row omits its value', async () => {
		const contacts = normalizeElement({
			$type: 'arrayElements',
			name: 'contacts',
			elements: [{ $type: 'input', name: 'email', rules: [{ type: 'required', message: 'Email is required' }] }],
		});
		const errors = await validateFormValues({
			elements: [contacts],
			values: { contacts: [{ email: 'ada@example.com' }, { name: 'Grace' }, { email: undefined }] },
			registry,
			debounceScope: createDebounceScope(),
		});

		expect(errors['contacts.1.email']).toEqual(failure('Email is required'));
		expect(errors['contacts.2.email']).toEqual(failure('Email is required'));
	});

	test('validates a nested array container against its concrete row path', async () => {
		const contacts = normalizeElement({
			$type: 'arrayElements',
			name: 'contacts',
			elements: [
				{
					$type: 'arrayElements',
					name: 'phones',
					rules: [{ type: 'minItems', value: 1 }],
					elements: [{ $type: 'input', name: 'number' }],
				},
			],
		});
		const errors = await validateFormValues({
			elements: [contacts],
			values: { contacts: [{ phones: ['555'] }] },
			registry,
			debounceScope: createDebounceScope(),
		});

		expect(errors).toEqual({});
	});
});

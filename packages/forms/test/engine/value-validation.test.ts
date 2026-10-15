import { describe, expect, test, vi } from 'vitest';
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
		await expect(validateFormValues({ elements: [element], values, registry })).resolves.toEqual({
			tags: [{ type: 'validation', message: 'Tag is required' }],
		});
	});

	test('expands sparse scalar array slots so required rules can validate them', async () => {
		const element = normalizeContainerFixture({
			$type: 'arrayElements',
			name: 'tags',
			elements: [{ $type: 'input', name: 'ignored', rules: [{ type: 'required', message: 'Tag is required' }] }],
		});
		const tags: undefined[] = [undefined];
		delete tags[0];
		const values = { tags };

		expect(collectStepFieldPaths({ elements: [element] }, values)).toEqual(['tags', 'tags.0']);
		await expect(validateFormValues({ elements: [element], values, registry })).resolves.toEqual({
			tags: [{ type: 'validation', message: 'Tag is required' }],
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
		await expect(validateFormValues({ elements: [element], values, registry })).resolves.toEqual({
			groups: [{ tags: [{ type: 'validation', message: 'Tag is required' }] }],
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
		await expect(validateFormValues({ elements: [element], values, registry })).resolves.toEqual({
			groups: [[{ type: 'validation', message: 'Tag is required' }]],
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
		});

		expect(message).toBe('Required');
	});

	test('settles superseded async validations across value snapshots', async () => {
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

			await expect(first).resolves.toBeUndefined();
			await vi.advanceTimersByTimeAsync(300);
			await expect(second).resolves.toBeUndefined();

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
			names: ['address.street'],
		});

		expect(errors).toEqual({
			address: { street: { type: 'validation', message: 'Street is required' } },
		});
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
		});

		expect(getValueAtPath(errors, 'languages')).toEqual({
			type: 'validation',
			message: 'Select a language',
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
		});

		expect(getValueAtPath(errors, 'contacts.1.email')).toEqual({
			type: 'validation',
			message: 'Email is required',
		});
		expect(getValueAtPath(errors, 'contacts.2.email')).toEqual({
			type: 'validation',
			message: 'Email is required',
		});
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
		});

		expect(errors).toEqual({});
	});
});

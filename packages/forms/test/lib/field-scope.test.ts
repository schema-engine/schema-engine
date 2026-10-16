import * as z from 'zod/mini';
import { createFormEngine } from '@/engine/create-form-engine';
import { defineInput } from '@/types';
import { normalizeContainerFixture } from './container-fixture';
import { getElementContainerKind, markNormalizedElementConfig } from '@/lib/normalized-form-config';
import { describe, expect, test } from 'vitest';
import {
	arrayItemScope,
	composeElementKey,
	composeFieldId,
	composeFieldName,
	objectFieldScope,
	walkNamedElements,
	walkLeafFields,
	collectFieldDefaults,
	flattenStepElements,
} from '@/lib/field-scope';

const namedInput = { $type: 'input', id: 'street', name: 'street' };
const unnamedNote = { $type: 'note', id: 'hint' };

describe('field-scope', () => {
	test('object scopes join the child name onto the prefix', () => {
		const scope = objectFieldScope('address');

		expect(composeFieldName(namedInput, scope)).toBe('address.street');
		expect(composeFieldName(namedInput)).toBe('street');
	});

	test('unnamed display elements keep an undefined field path', () => {
		expect(composeFieldName(unnamedNote, objectFieldScope('address'))).toBeUndefined();
		expect(composeFieldName(unnamedNote, arrayItemScope('contacts', 0, 'item-a'))).toBeUndefined();
	});

	test('scalar array items replace the child name with the item path', () => {
		const scope = arrayItemScope('tags', 1, 'item-b', { scalar: true });

		expect(composeFieldName(namedInput, scope)).toBe('tags.1');
		expect(composeFieldName(unnamedNote, scope)).toBe('tags.1');
	});

	test('object array items join nested names, including nested arrays', () => {
		const item = arrayItemScope('contacts', 0, 'contact-a');
		const nestedArray = arrayItemScope('contacts.0.phones', 2, 'phone-c');

		expect(composeFieldName(namedInput, item)).toBe('contacts.0.street');
		expect(composeFieldName({ name: 'number' }, nestedArray)).toBe('contacts.0.phones.2.number');
	});

	test('ids and keys use the instance id, not the current index', () => {
		const first = arrayItemScope('contacts', 0, 'stable-a');
		const afterRemoval = arrayItemScope('contacts', 0, 'stable-b');

		expect(composeFieldId(namedInput, first)).toBe('street_stable-a');
		expect(composeFieldId(namedInput, afterRemoval)).toBe('street_stable-b');
		expect(composeElementKey(namedInput, 0, first)).toBe('stable-a:street');
		expect(composeElementKey(namedInput, 0, afterRemoval)).toBe('stable-b:street');
		expect(composeElementKey(unnamedNote, 4)).toBe('hint_4');
	});

	test('array children without ids keep a positional identity under the item', () => {
		const item = arrayItemScope('contacts', 0, 'item-a');
		const firstInput = { $type: 'input' };
		const secondInput = { $type: 'input' };

		expect(composeElementKey(firstInput, 0, item)).toBe('item-a:input_0');
		expect(composeElementKey(secondInput, 1, item)).toBe('item-a:input_1');
	});

	test('nested object scopes keep the parent instance identity', () => {
		const item = arrayItemScope('contacts', 0, 'item-a');
		const nested = objectFieldScope('contacts.0.address', item);

		expect(composeFieldId({ id: 'street' }, nested)).toBe('street_item-a');
		expect(composeElementKey({ $type: 'input', id: 'street' }, 0, nested)).toBe('item-a:street');
	});

	test('nested arrays compose instance identity onto the parent item', () => {
		const nested = arrayItemScope('contacts.0.phones', 1, 'phone-c', { parentInstanceId: 'item-a' });

		expect(nested.instanceId).toBe('item-a:phone-c');
		expect(composeFieldId({ id: 'number' }, nested)).toBe('number_item-a:phone-c');
		expect(composeElementKey({ $type: 'input' }, 0, nested)).toBe('item-a:phone-c:input_0');
	});
});

describe('named element tree walk', () => {
	test('composes nested fieldset paths and skips unnamed display elements', () => {
		const street = { $type: 'input', name: 'street', defaultValue: '1 Main' };
		const hint = { $type: 'note', id: 'hint' };
		const address = { $type: 'fieldset', name: 'address', elements: [street, hint] };

		expect(walkNamedElements([address])).toEqual([
			{ path: 'address', element: address, hasChildren: true },
			{ path: 'address.street', element: street, hasChildren: false },
		]);
		expect(collectFieldDefaults([address])).toEqual([
			{ name: 'address', defaultValue: undefined },
			{ name: 'address.street', defaultValue: '1 Main' },
		]);
		expect(walkLeafFields([address]).map((node) => node.path)).toEqual(['address.street']);
	});

	test('flattens step element lists in document order', () => {
		expect(
			flattenStepElements([
				{ elements: [{ name: 'first' }] },
				{ elements: [{ name: 'second' }, { name: 'third' }] },
			]),
		).toEqual([{ name: 'first' }, { name: 'second' }, { name: 'third' }]);
	});

	test('keeps array child paths as templates without indices', () => {
		const name = { $type: 'input', name: 'name', defaultValue: 'Ada' };
		const contacts = { $type: 'arrayElements', name: 'contacts', elements: [name] };

		expect(walkNamedElements([contacts]).map((node) => node.path)).toEqual(['contacts', 'contacts.name']);
		expect(walkLeafFields([contacts]).map((node) => node.path)).toEqual(['contacts.name']);
	});

	test('seeds object-array child defaults at item index 0', () => {
		const contacts = {
			$type: 'arrayElements',
			name: 'contacts',
			elements: [
				{ $type: 'input', name: 'name', defaultValue: 'Ada' },
				{ $type: 'input', name: 'email' },
			],
		};

		expect(collectFieldDefaults([contacts].map(normalizeContainerFixture))).toEqual([
			{ name: 'contacts', defaultValue: undefined },
			{ name: 'contacts.0.name', defaultValue: 'Ada' },
			{ name: 'contacts.0.email', defaultValue: undefined },
		]);
	});

	test('seeds scalar-array child defaults at the item path', () => {
		const tags = {
			$type: 'arrayElements',
			name: 'tags',
			elements: [{ $type: 'input', name: 'tag', defaultValue: 'Ada' }],
		};

		expect(collectFieldDefaults([tags].map(normalizeContainerFixture))).toEqual([
			{ name: 'tags', defaultValue: undefined },
			{ name: 'tags.0', defaultValue: 'Ada' },
		]);
	});

	test('uses object item paths for a single child when row defaults are objects', () => {
		const members = {
			$type: 'arrayElements',
			name: 'members',
			initialValues: { role: 'viewer' },
			elements: [{ $type: 'input', name: 'role' }],
		};

		expect(
			collectFieldDefaults([members].map(normalizeContainerFixture), { members: [{ role: 'admin' }] }),
		).toEqual([
			{ name: 'members', defaultValue: undefined },
			{ name: 'members.0.role', defaultValue: undefined },
		]);
	});

	test('uses object item paths for a single fieldset child with nested defaults', () => {
		const members = {
			$type: 'arrayElements',
			name: 'members',
			elements: [
				{
					$type: 'fieldSet',
					name: 'address',
					elements: [{ $type: 'input', name: 'street', defaultValue: '1 Main' }],
				},
			],
		};

		expect(collectFieldDefaults([members].map(normalizeContainerFixture))).toEqual([
			{ name: 'members', defaultValue: undefined },
			{ name: 'members.0.address', defaultValue: undefined },
			{ name: 'members.0.address.street', defaultValue: '1 Main' },
		]);
	});

	test('seeds minItems slots and nested array paths', () => {
		const phones = {
			$type: 'arrayElements',
			name: 'phones',
			elements: [{ $type: 'input', name: 'number', defaultValue: '555' }],
		};
		const contacts = {
			$type: 'arrayElements',
			name: 'contacts',
			minItems: 2,
			elements: [{ $type: 'input', name: 'name', defaultValue: 'Ada' }, phones],
		};

		expect(
			collectFieldDefaults([contacts].map(normalizeContainerFixture)).filter(
				(field) => field.defaultValue !== undefined,
			),
		).toEqual([
			{ name: 'contacts.0.name', defaultValue: 'Ada' },
			{ name: 'contacts.0.phones.0', defaultValue: '555' },
			{ name: 'contacts.1.name', defaultValue: 'Ada' },
			{ name: 'contacts.1.phones.0', defaultValue: '555' },
		]);
	});

	test('seeds child defaults across provider array length', () => {
		const contacts = {
			$type: 'arrayElements',
			name: 'contacts',
			elements: [
				{ $type: 'input', name: 'name', defaultValue: 'Ada' },
				{ $type: 'input', name: 'email' },
			],
		};

		expect(
			collectFieldDefaults([contacts].map(normalizeContainerFixture), {
				contacts: [{ email: 'ada@example.com' }, { name: 'Grace' }],
			}).filter((field) => field.defaultValue !== undefined),
		).toEqual([
			{ name: 'contacts.0.name', defaultValue: 'Ada' },
			{ name: 'contacts.1.name', defaultValue: 'Ada' },
		]);
	});
});

test('container semantics come from the registration rather than the widget name', () => {
	const engine = createFormEngine({
		elements: [
			defineInput({
				$type: 'rows',
				containerKind: 'array',
				schema: z.looseObject({ $type: z.literal('rows') }),
				metadata: { name: 'Rows', category: 'input' },
				render: (_props: Record<string, unknown>) => null,
			}),
			defineInput({
				$type: 'text',
				schema: z.looseObject({ $type: z.literal('text') }),
				metadata: { name: 'Text', category: 'input' },
				render: (_props: Record<string, unknown>) => null,
			}),
		],
	});
	const rows = engine.validateElement({
		$type: 'rows',
		name: 'tags',
		minItems: 2,
		elements: [{ $type: 'text', name: 'ignored', defaultValue: 'seed' }],
	});
	expect(collectFieldDefaults([rows])).toEqual([
		{ name: 'tags', defaultValue: undefined },
		{ name: 'tags.0', defaultValue: 'seed' },
		{ name: 'tags.1', defaultValue: 'seed' },
	]);
	expect(walkLeafFields([rows]).map(({ path }) => path)).toEqual(['tags']);
	expect(Object.keys(rows)).not.toContain('containerKind');
	const validatedForm = engine.validateForm({
		id: 'rows',
		steps: [
			{
				id: 'step',
				title: 'Step',
				elements: [
					{
						$type: 'rows',
						name: 'tags',
						elements: [{ $type: 'text', name: 'ignored', defaultValue: 'seed' }],
					},
				],
			},
		],
	});
	const normalizedRows = validatedForm.steps[0].elements[0];
	expect(normalizedRows).toBeDefined();
	expect(getElementContainerKind(normalizedRows)).toBe('array');
});

test('revalidation replaces container semantics on a normalized element', () => {
	const element = markNormalizedElementConfig({ $type: 'rows', name: 'tags' }, 'array');
	const revalidated = markNormalizedElementConfig(element, 'object');

	expect(revalidated).not.toBe(element);
	expect(getElementContainerKind(revalidated)).toBe('object');
	expect(Object.keys(revalidated)).toEqual(['$type', 'name']);
	expect(markNormalizedElementConfig(element)).toBe(element);
	expect(getElementContainerKind(markNormalizedElementConfig(element))).toBe('array');
});

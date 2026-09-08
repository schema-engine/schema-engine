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
});

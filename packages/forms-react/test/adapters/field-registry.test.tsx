import { afterEach, describe, expect, test } from 'vitest';
import { createFieldRegistry } from '@/hooks/form-state/field-registry';

const elements: HTMLElement[] = [];
const control = (): HTMLInputElement => {
	const input = document.createElement('input');
	document.body.append(input);
	elements.push(input);
	return input;
};
afterEach(() => elements.splice(0).forEach((element) => element.remove()));

describe('the field registry', () => {
	test('focusFirst takes a path with controls below it, such as an array with a rule of its own, and the first in document order', () => {
		const registry = createFieldRegistry();
		const first = control();
		const second = control();
		registry.register('other', second);
		registry.register('contacts.0.email', first);

		registry.focusFirst(['other', 'contacts']);

		expect(first).toHaveFocus();
	});

	test('a control that unmounts hands its path back to the one that registered before it', () => {
		const registry = createFieldRegistry();
		const earlier = control();
		const later = control();
		registry.register('name', earlier);
		const release = registry.register('name', later);

		release();
		registry.focus('name');

		expect(earlier).toHaveFocus();
	});
});

import { describe, expect, test } from 'vitest';
import { FormStore } from '@ecopages/radiant-ui/form';
import { validateCurrentStepFields } from '@/lib/validate-current-step';
import { collectStepFieldPaths as fieldNamesForStep } from '@schema-engine/forms';

function registerField(store: FormStore, name: string, getValue: () => unknown, requiredMessage: string) {
	store.register({
		name,
		getValue,
		setValue: () => undefined,
		rules: { required: requiredMessage },
	});
}

describe('fieldNamesForStep', () => {
	test('returns only the names from that step', () => {
		expect(
			fieldNamesForStep({
				elements: [{ name: 'firstName' }, { name: 'lastName' }, { name: undefined }],
			}),
		).toEqual(['firstName', 'lastName']);
	});

	test('reaches fields nested inside a fieldset', () => {
		expect(
			fieldNamesForStep({
				elements: [
					{
						$type: 'fieldset',
						name: 'address',
						elements: [{ name: 'street' }, { name: 'city' }],
					},
				],
			}),
		).toEqual(['address', 'address.street', 'address.city']);
	});

	test('expands an array template to one path per row', () => {
		expect(
			fieldNamesForStep(
				{
					elements: [
						{
							$type: 'arrayElements',
							name: 'contacts',
							elements: [{ name: 'email' }],
						},
					],
				},
				{ contacts: [{ email: 'a@example.com' }, { email: 'b@example.com' }] },
			),
		).toEqual(['contacts', 'contacts.0.email', 'contacts.1.email']);
	});

	test('falls back to the template when the array has no rows yet', () => {
		expect(
			fieldNamesForStep({
				elements: [{ $type: 'arrayElements', name: 'contacts', elements: [{ name: 'email' }] }],
			}),
		).toEqual(['contacts', 'contacts.email']);
	});
});

describe('validateCurrentStepFields', () => {
	test('validates only the current step fields and leaves later fields untriggered', async () => {
		const store = new FormStore();
		registerField(store, 'firstName', () => '', 'First name is required');
		registerField(store, 'email', () => '', 'Email is required');

		const isValid = await validateCurrentStepFields(store, ['firstName']);

		expect(isValid).toBe(false);
		expect(store.getFieldError('firstName')).toBe('First name is required');
		expect(store.getFieldError('email')).toBeUndefined();
	});

	test('passes when the current step fields are valid without validating the next step', async () => {
		const store = new FormStore();
		registerField(store, 'firstName', () => 'Jane', 'First name is required');
		registerField(store, 'email', () => '', 'Email is required');

		const isValid = await validateCurrentStepFields(store, ['firstName']);

		expect(isValid).toBe(true);
		expect(store.getFieldError('firstName')).toBeUndefined();
		expect(store.getFieldError('email')).toBeUndefined();
	});
});

import { describe, expect, test } from 'vitest';
import { createFormEngine } from '@schema-engine/forms';
import { PhoneInputElementRegistration } from '@/components/schema-engine/forms/inputs/form-phone-input.registration';
import { createFormValidationResolver } from '../../src/adapters/rhf/hooks/use-form-validation-resolver';

const elements = [
	{
		name: 'firstName',
		rules: [{ type: 'required', message: 'First name is required' }],
	},
	{
		name: 'email',
		rules: [{ type: 'email', message: 'Please enter a valid email address' }],
	},
];

describe('createFormValidationResolver', () => {
	test('validates every field when names are omitted', async () => {
		const resolver = createFormValidationResolver(elements);
		const resolved = await resolver({ firstName: '', email: '' }, undefined, {
			fields: {},
			shouldUseNativeValidation: false,
		});

		expect(resolved.errors).toMatchObject({
			firstName: { message: 'First name is required' },
			email: { message: 'Please enter a valid email address' },
		});
	});

	test('validates only requested fields so later steps stay untriggered', async () => {
		const resolver = createFormValidationResolver(elements);
		const resolved = await resolver({ firstName: '', email: '' }, undefined, {
			fields: {},
			names: ['firstName'],
			shouldUseNativeValidation: false,
		});

		expect(resolved.errors).toMatchObject({
			firstName: { message: 'First name is required' },
		});
		expect(resolved.errors).not.toHaveProperty('email');
	});

	test('rejects a phone country prefix while accepting a complete international number', async () => {
		createFormEngine({ elements: [PhoneInputElementRegistration] });
		const resolver = createFormValidationResolver([
			{
				$type: 'phone-input',
				id: 'phone',
				name: 'phone',
			},
		]);
		const options = { fields: {}, shouldUseNativeValidation: false };

		const incomplete = await resolver({ phone: '+44' }, undefined, options);
		expect(incomplete.errors).toMatchObject({
			phone: { message: 'Enter a complete phone number' },
		});

		const complete = await resolver({ phone: '+442079460958' }, undefined, options);
		expect(complete.errors).toEqual({});
	});

	test('validates nested fieldset children by composed path', async () => {
		const resolver = createFormValidationResolver([
			{
				name: 'address',
				$type: 'fieldset',
				elements: [
					{
						name: 'street',
						rules: [{ type: 'required', message: 'Street is required' }],
					},
				],
			},
		]);
		const resolved = await resolver({ address: { street: '' } }, undefined, {
			fields: {},
			shouldUseNativeValidation: false,
		});

		expect(resolved.errors).toMatchObject({
			'address.street': { message: 'Street is required' },
		});
	});
});

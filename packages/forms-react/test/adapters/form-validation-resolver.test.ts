import { describe, expect, test } from 'vitest';
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
		const phone = {
			$type: 'phone-input',
			id: 'phone',
			name: 'phone',
		};
		const resolver = createFormValidationResolver([phone]);
		const options = { fields: {}, shouldUseNativeValidation: false };

		const incomplete = await resolver({ phone: '+44' }, undefined, options);
		expect(incomplete.errors).toMatchObject({
			phone: { message: 'Enter a complete phone number' },
		});

		const complete = await resolver({ phone: '+442079460958' }, undefined, options);
		expect(complete.errors).toEqual({});
	});
});

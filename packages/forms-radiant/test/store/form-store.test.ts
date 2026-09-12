import { describe, expect, test } from 'vitest';
import { FormStore } from '@/adapters/store/form-store';
import type { FormConfig } from '@schema-engine/forms/schemas';
import { registerValidation } from '@schema-engine/forms/schemas/validation';
import { createRadiantPhoneValidationRegistration } from '@/lib/phone-validation';

const sampleConfig: FormConfig = {
	id: 'test-form',
	steps: [
		{
			id: 'step-1',
			elements: [
				{
					$type: 'input',
					id: 'name',
					name: 'name',
					label: 'Name',
					rules: [{ type: 'required', message: 'Name is required' }],
				},
				{
					$type: 'input',
					id: 'email',
					name: 'email',
					label: 'Email',
					inputType: 'email',
					rules: [
						{ type: 'required', message: 'Email is required' },
						{ type: 'email', message: 'Invalid email' },
					],
				},
			],
		},
	],
};

describe('FormStore', () => {
	test('sets and reads field values', () => {
		const store = new FormStore(sampleConfig);
		store.setValue('name', 'Ada');
		expect(store.getValue('name')).toBe('Ada');
	});

	test('validates required fields', async () => {
		const store = new FormStore(sampleConfig);
		const isValid = await store.validateAll();
		expect(isValid).toBe(false);
		expect(store.getError('name')).toBe('Name is required');
	});

	test('passes validation with valid values', async () => {
		const store = new FormStore(sampleConfig);
		store.setValue('name', 'Ada');
		store.setValue('email', 'ada@example.com');
		const isValid = await store.validateAll();
		expect(isValid).toBe(true);
	});

	test('rejects incomplete phone prefixes from raw phone-input configuration', async () => {
		registerValidation(createRadiantPhoneValidationRegistration());
		const config: FormConfig = {
			id: 'phone-form',
			steps: [
				{
					id: 'step-1',
					elements: [{ $type: 'phone-input', id: 'phone', name: 'phone' }],
				},
			],
		};
		const store = new FormStore(config);

		store.setValue('phone', '+44');
		expect(await store.validateAll()).toBe(false);
		expect(store.getError('phone')).toBe('Enter a complete phone number');

		store.setValue('phone', '+442079460958');
		expect(await store.validateAll()).toBe(true);
	});
});

import { describe, expect, test } from 'vitest';
import { FormStore } from '@ecopages/radiant-ui/form';
import { fieldNamesForStep, validateCurrentStepFields } from '@/lib/validate-current-step';

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

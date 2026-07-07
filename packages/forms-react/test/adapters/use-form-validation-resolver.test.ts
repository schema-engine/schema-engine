import { describe, it, expect } from 'bun:test';
import { renderHook } from '@testing-library/react';
import { useFormValidationResolver } from '../../src/adapters/rhf/hooks/use-form-validation-resolver';

describe('useFormValidationResolver', () => {
	it('returns no errors when all fields pass Standard Schema validation', async () => {
		const elements = [
			{
				name: 'email',
				rules: [
					{ type: 'required', message: 'Email is required' },
					{ type: 'email', message: 'Invalid email' },
				],
			},
		];

		const { result } = renderHook(() => useFormValidationResolver(elements));
		const resolver = result.current;

		const outcome = await resolver({ email: 'user@example.com' }, undefined, {
			fields: {},
			shouldUseNativeValidation: false,
		});

		expect(outcome.errors).toEqual({});
		expect(outcome.values).toEqual({ email: 'user@example.com' });
	});

	it('maps Standard Schema validation failures to RHF field errors', async () => {
		const elements = [
			{
				name: 'email',
				rules: [{ type: 'required', message: 'Email is required' }],
			},
		];

		const { result } = renderHook(() => useFormValidationResolver(elements));
		const outcome = await result.current({ email: '' }, undefined, {
			fields: {},
			shouldUseNativeValidation: false,
		});

		expect(outcome.values).toEqual({});
		expect(outcome.errors.email).toEqual({
			type: 'validation',
			message: 'Email is required',
		});
	});

	it('validates dynamic array field paths', async () => {
		const elements = [
			{
				name: 'contacts.name',
				rules: [{ type: 'required', message: 'Name is required' }],
			},
		];

		const { result } = renderHook(() => useFormValidationResolver(elements));
		const outcome = await result.current(
			{
				contacts: [{ name: 'Ada' }, { name: '' }],
			},
			undefined,
			{ fields: {}, shouldUseNativeValidation: false },
		);

		expect(outcome.errors['contacts.1.name']).toEqual({
			type: 'validation',
			message: 'Name is required',
		});
	});
});

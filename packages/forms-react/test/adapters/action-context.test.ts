import { describe, test, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useForm, type FieldValues } from 'react-hook-form';
import { useFormActionDispatchers } from '../../src/adapters/rhf/hooks/use-form-action-dispatchers';
import type { FormConfig } from '@schema-engine/forms/schemas';
import { createDefaultValidationRegistry } from '@schema-engine/forms/schemas/validation';
import type { ActionDispatcher } from '@schema-engine/actions';

const config: FormConfig = {
	id: 'test-form',
	steps: [
		{ id: 'step-1', title: 'Step 1', elements: [] },
		{ id: 'step-2', title: 'Step 2', elements: [] },
	],
};

const registry = createDefaultValidationRegistry();

const mockDispatcher = {
	dispatch: async () => [],
	dispatchSync: () => {},
	hasMatching: () => true,
} as unknown as ActionDispatcher;

describe('useFormActionDispatchers', () => {
	test('buildActionContext uses getCurrentStep and form mount time', () => {
		const mountTime = Date.now() - 5000;
		let currentStep = 1;

		const { result: formResult } = renderHook(() => useForm({ defaultValues: {} }));
		const { result } = renderHook(() =>
			useFormActionDispatchers({
				form: formResult.current,
				config,
				registry,
				actionExecutor: mockDispatcher,
				getCurrentStep: () => currentStep,
				formMountTime: mountTime,
			}),
		);

		const context = result.current.buildActionContext();

		expect(context.currentStep).toBe(1);
		expect(context.totalSteps).toBe(2);
		expect(context.metadata?.totalFormTime).toBeGreaterThanOrEqual(5000);

		act(() => {
			currentStep = 0;
		});

		expect(result.current.buildActionContext().currentStep).toBe(0);
	});

	test('building a context does not validate the form on later changes', async () => {
		const resolver = vi.fn(async (values: FieldValues) => ({ values, errors: {} }));
		const { result: formResult } = renderHook(() =>
			useForm<FieldValues>({ defaultValues: { email: '' }, resolver }),
		);
		const { result } = renderHook(() =>
			useFormActionDispatchers({ form: formResult.current, config, registry, actionExecutor: mockDispatcher }),
		);

		const context = result.current.buildActionContext();
		act(() => formResult.current.setValue('email', 'a@b.co'));
		await act(async () => undefined);

		expect(context.isValid).toBe(true);
		expect(resolver).not.toHaveBeenCalled();
	});

	test('a trigger no action answers builds no context and dispatches nothing', async () => {
		const dispatch = vi.fn(async () => []);
		const actionExecutor = { dispatch, hasMatching: () => false } as unknown as ActionDispatcher;
		const { result: formResult } = renderHook(() => useForm({ defaultValues: {} }));
		const getValues = vi.spyOn(formResult.current, 'getValues');
		const { result } = renderHook(() =>
			useFormActionDispatchers({ form: formResult.current, config, registry, actionExecutor }),
		);

		await expect(result.current.dispatchTrigger('form_change')).resolves.toEqual([]);

		expect(dispatch).not.toHaveBeenCalled();
		expect(getValues).not.toHaveBeenCalled();
	});

	test('checkValidity validates silently without recording errors', async () => {
		const required: FormConfig = {
			id: 'test-form',
			steps: [
				{
					id: 'step-1',
					title: 'Step 1',
					elements: [{ name: 'email', $type: 'input', inputType: 'text', rules: [{ type: 'required' }] }],
				},
			],
		};
		const { result: formResult } = renderHook(() => useForm<FieldValues>({ defaultValues: { email: '' } }));
		const { result } = renderHook(() =>
			useFormActionDispatchers({
				form: formResult.current,
				config: required,
				registry,
				actionExecutor: mockDispatcher,
			}),
		);

		const form = result.current.buildActionContext().form;

		await expect(form.checkValidity()).resolves.toBe(false);
		expect(formResult.current.formState.errors).toEqual({});
	});
});

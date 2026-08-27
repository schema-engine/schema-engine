import { describe, test, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useForm } from 'react-hook-form';
import { useFormActionDispatchers } from '../../src/adapters/rhf/hooks/use-form-action-dispatchers';
import type { FormConfig } from '@schema-engine/forms/schemas';
import type { ActionDispatcher } from '@schema-engine/actions';

const config: FormConfig = {
	id: 'test-form',
	steps: [
		{ id: 'step-1', title: 'Step 1', elements: [] },
		{ id: 'step-2', title: 'Step 2', elements: [] },
	],
};

const mockDispatcher = {
	dispatch: async () => [],
	dispatchSync: () => {},
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
});

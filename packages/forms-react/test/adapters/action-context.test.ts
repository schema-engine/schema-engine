import { describe, test, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useFormActionDispatchers } from '../../src/components/form-runtime/use-form-action-dispatchers';
import type { FormConfig } from '@schema-engine/forms/schemas';
import type { ActionDispatcher } from '@schema-engine/actions';
import { createSubmissionStatusStore } from '../../src/hooks/form-state/submission-status';
import { createTestContainer } from '../utils/container-harness';

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
	hasMatching: () => true,
} as unknown as ActionDispatcher;

function setup(
	options: Partial<Parameters<typeof useFormActionDispatchers>[0]> & { defaults?: Record<string, unknown> } = {},
) {
	const { defaults = {}, ...overrides } = options;
	const container = createTestContainer({ defaults });
	const status = createSubmissionStatusStore();
	const rendered = renderHook(() =>
		useFormActionDispatchers({
			container,
			status,
			config,
			actionExecutor: mockDispatcher,
			...overrides,
		}),
	);
	return { container, status, ...rendered };
}

describe('useFormActionDispatchers', () => {
	test('buildActionContext uses getCurrentStep and form mount time', () => {
		const mountTime = Date.now() - 5000;
		let currentStep = 1;
		const { result } = setup({ getCurrentStep: () => currentStep, formMountTime: mountTime });

		const context = result.current.buildActionContext();

		expect(context.currentStep).toBe(1);
		expect(context.totalSteps).toBe(2);
		expect(context.metadata?.totalFormTime).toBeGreaterThanOrEqual(5000);

		act(() => {
			currentStep = 0;
		});

		expect(result.current.buildActionContext().currentStep).toBe(0);
	});

	test('a context carries the container values, flat errors and the submissions that ended', async () => {
		const container = createTestContainer({
			elements: [{ $type: 'input', name: 'email', rules: [{ type: 'required', message: 'Required' }] }],
			defaults: { email: '' },
		});
		const status = createSubmissionStatusStore();
		const { result } = renderHook(() =>
			useFormActionDispatchers({ container, status, config, actionExecutor: mockDispatcher }),
		);
		await container.validate();
		status.begin();
		status.end(true);

		const context = result.current.buildActionContext();

		expect(context.formData).toEqual({ email: '' });
		expect(context.errors).toEqual({ email: expect.objectContaining({ type: 'required', message: 'Required' }) });
		expect(context.isValid).toBe(false);
		expect(context.metadata?.userInteractions).toBe(1);
	});

	test('building a context does not validate the form on later changes', async () => {
		const container = createTestContainer({
			elements: [{ $type: 'input', name: 'email', rules: [{ type: 'required' }] }],
			defaults: { email: '' },
			validationMode: 'onSubmit',
		});
		const validate = vi.spyOn(container, 'validate');
		const status = createSubmissionStatusStore();
		const { result } = renderHook(() =>
			useFormActionDispatchers({ container, status, config, actionExecutor: mockDispatcher }),
		);

		const context = result.current.buildActionContext();
		act(() => container.setValue('email', 'a@b.co'));
		await act(async () => undefined);

		expect(context.isValid).toBe(true);
		expect(validate).not.toHaveBeenCalled();
	});

	test('a trigger no action answers builds no context and dispatches nothing', async () => {
		const dispatch = vi.fn(async () => []);
		const actionExecutor = { dispatch, hasMatching: () => false } as unknown as ActionDispatcher;
		const { result, container } = setup({ actionExecutor });
		const getSnapshot = vi.spyOn(container, 'getSnapshot');

		await expect(result.current.dispatchTrigger('form_change')).resolves.toEqual([]);

		expect(dispatch).not.toHaveBeenCalled();
		expect(getSnapshot).not.toHaveBeenCalled();
	});

	test('checkValidity validates silently without recording errors', async () => {
		const container = createTestContainer({
			elements: [{ name: 'email', $type: 'input', rules: [{ type: 'required' }] }],
			defaults: { email: '' },
		});
		const status = createSubmissionStatusStore();
		const { result } = renderHook(() =>
			useFormActionDispatchers({ container, status, config, actionExecutor: mockDispatcher }),
		);

		const form = result.current.buildActionContext().form;

		await expect(form.checkValidity()).resolves.toBe(false);
		expect(container.getSnapshot().errors).toEqual({});
	});

	test('reset restores the defaults and the submission count', () => {
		const { container, status, result } = setup({ defaults: { email: 'a' } });
		container.setValue('email', 'b');
		status.begin();
		status.end(true);

		act(() => result.current.buildActionContext().form.reset());

		expect(container.getValue('email')).toBe('a');
		expect(status.getSnapshot().submitCount).toBe(0);
	});
});

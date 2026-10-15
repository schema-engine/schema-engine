import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { FormProvider } from '../../src/adapters/rhf/form-provider';
import type { FormConfig } from '@schema-engine/forms/schemas';
import { createDefaultValidationRegistry } from '@schema-engine/forms/schemas/validation';
import { mockDispatch } from '../utils/use-action-executor.mock';
import { useFormContext as useReactHookFormContext } from 'react-hook-form';

vi.mock('@schema-engine/actions', async () => {
	const { mockDispatch, mockDispatchSync } = await import('../utils/use-action-executor.mock');
	return {
		ActionDispatcher: class {
			dispatch = mockDispatch;
			dispatchSync = mockDispatchSync;
		},
	};
});

vi.mock('@/hooks/use-form-context', () => ({
	useFormEngine: () => ({ engine: { getValidationRegistry: () => createDefaultValidationRegistry() } }),
}));

vi.mock('../../src/adapters/rhf/hooks/use-form-validation-resolver', () => ({
	useFormValidationResolver: () => async () => ({ values: {}, errors: {} }),
}));

describe('FormProvider', () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});
	const config: FormConfig = {
		id: 'test-form',
		title: 'Test Form',
		mode: 'wizard',
		steps: [{ id: 'step-1', title: 'Step 1', elements: [{ name: 'field1', $type: 'input', inputType: 'text' }] }],
		actions: [
			{
				id: 'action-1',
				$type: 'submit',
				enabled: true,
				endpoint: '/submit',
				method: 'POST',
				triggers: ['form_mount'],
			},
			{
				id: 'action-2',
				$type: 'submit',
				enabled: true,
				endpoint: '/submit',
				method: 'POST',
				triggers: ['form_submit_start'],
			},
			{
				id: 'action-3',
				$type: 'submit',
				enabled: true,
				endpoint: '/submit',
				method: 'POST',
				triggers: ['form_submit'],
			},
		],
	};

	beforeEach(() => {
		mockDispatch.mockClear();
	});

	function RegisteredInput() {
		const form = useReactHookFormContext();
		return <input data-testid="field1" {...form.register('field1')} />;
	}

	it('should fire form_mount on mount', async () => {
		render(
			<FormProvider config={config}>
				<div>Form Content</div>
			</FormProvider>,
		);

		await waitFor(() => {
			expect(mockDispatch).toHaveBeenCalled();
		});

		const calls = mockDispatch.mock.calls;
		const formStartCall = calls.find((call) => call[0]?.trigger === 'form_mount');
		expect(formStartCall).toBeDefined();
	});

	it('should fire form_submit_start before form_submit on submit', async () => {
		render(
			<FormProvider config={config}>
				<button type="submit">Submit</button>
			</FormProvider>,
		);

		const submitButton = screen.getByText('Submit');
		fireEvent.click(submitButton);

		await waitFor(() => {
			const calls = mockDispatch.mock.calls;
			const submitStartCalls = calls.filter((call) => call[0]?.trigger === 'form_submit_start');
			const formSubmitCalls = calls.filter((call) => call[0]?.trigger === 'form_submit');

			expect(submitStartCalls.length).toBeGreaterThanOrEqual(1);
			expect(formSubmitCalls.length).toBeGreaterThanOrEqual(1);
		});

		const calls = mockDispatch.mock.calls;

		const submitRelatedCalls = calls.filter((call) =>
			['form_submit_start', 'form_submit'].includes(call[0]?.trigger),
		);

		const lastSubmitStart = submitRelatedCalls.findIndex((call) => call[0]?.trigger === 'form_submit_start');
		const lastFormSubmit = submitRelatedCalls.findIndex((call) => call[0]?.trigger === 'form_submit');

		expect(lastSubmitStart).toBeGreaterThan(-1);
		expect(lastFormSubmit).toBeGreaterThan(-1);

		const submitStartIndex = calls.findIndex((call) => call[0]?.trigger === 'form_submit_start');
		const formSubmitIndex = calls.findIndex((call) => call[0]?.trigger === 'form_submit');

		expect(submitStartIndex).toBeLessThan(formSubmitIndex);
	});

	it('should keep consumer onChange callbacks non-blocking when form_change actions fail', async () => {
		const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
		const onChange = vi.fn(() => undefined);

		mockDispatch.mockImplementation((input) => {
			if (input.trigger === 'form_change') {
				return Promise.reject(new Error('form_change failed'));
			}

			return Promise.resolve([{ success: true }]);
		});

		render(
			<FormProvider config={config} onChange={onChange}>
				<RegisteredInput />
			</FormProvider>,
		);

		fireEvent.change(screen.getByTestId('field1'), { target: { value: 'new value' } });

		await waitFor(() => {
			expect(onChange).toHaveBeenCalled();
		});

		await waitFor(() => {
			const message = consoleError.mock.calls.flat().join(' ');
			expect(message).toContain('[schema-engine/forms-react]');
			expect(message).toContain('Form change action execution failed:');
			expect(message).toContain('Error: form_change failed');
		});
	});
});

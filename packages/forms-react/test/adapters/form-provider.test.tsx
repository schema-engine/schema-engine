import { fieldText } from '@/hooks/field-text';
import { getDefaultLayoutTheme } from '@schema-engine/layout';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { FormProvider } from '../../src/components/form-provider';
import { useFormField } from '../../src/adapters';
import type { ElementConfig, FormConfig } from '@schema-engine/forms/schemas';
import { createDefaultValidationRegistry } from '@schema-engine/forms/schemas/validation';
import * as z from 'zod/mini';
import { createFormEngine, defineInput } from '@schema-engine/forms';
import { mockDispatch } from '../utils/use-action-executor.mock';

/** @remarks The real registrations import the mocked engine hook, so this engine registers a bare input. */
const testEngine = createFormEngine({
	elements: [
		defineInput({
			$type: 'input',
			schema: z.looseObject({ $type: z.literal('input'), name: z.string() }),
			metadata: { name: 'Input', category: 'input' },
			render: (config: ElementConfig) => <input name={config.name} readOnly />,
		}),
	],
	actions: [
		{
			$type: 'submit',
			schema: z.looseObject({ $type: z.literal('submit'), id: z.string() }),
			metadata: { name: 'Submit' },
			execute: async () => ({ success: true }),
		},
	],
});

vi.mock('@schema-engine/forms/actions', async () => {
	const { mockDispatch, mockDispatchSync } = await import('../utils/use-action-executor.mock');
	return {
		ActionDispatcher: class {
			dispatch = mockDispatch;
			dispatchSync = mockDispatchSync;
			hasMatching = () => true;
		},
	};
});

vi.mock('@/hooks/use-form-context', () => ({
	useFormEngine: () => ({
		engine: {
			getValidationRegistry: () => createDefaultValidationRegistry(),
			getLayout: () => getDefaultLayoutTheme(),
			getIssueFormatter: () => undefined,
		},
	}),
}));

describe('FormProvider', () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});
	const config: FormConfig = {
		id: 'test-form',
		title: 'Test Form',
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
		const { value, onChange, onBlur } = useFormField({
			$type: 'input',
			name: 'field1',
			id: 'field1',
		});
		return (
			<input
				data-testid="field1"
				value={fieldText(value)}
				onChange={(event) => onChange(event.target.value)}
				onBlur={onBlur}
			/>
		);
	}

	it('should fire form_mount on mount', async () => {
		render(
			<FormProvider config={testEngine.validateForm(config)}>
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
			<FormProvider config={testEngine.validateForm(config)}>
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

	it('gives form_submit the values written by a form_submit_start action', async () => {
		mockDispatch.mockImplementation((input) => {
			if (input.trigger === 'form_submit_start') {
				input.context.form.setValue('field1', 'prepared');
			}
			return Promise.resolve([{ success: true }]);
		});

		render(
			<FormProvider config={testEngine.validateForm(config)}>
				<RegisteredInput />
				<button type="submit">Submit</button>
			</FormProvider>,
		);

		fireEvent.click(screen.getByText('Submit'));

		await waitFor(() => {
			const submitCall = mockDispatch.mock.calls.find((call) => call[0]?.trigger === 'form_submit');
			expect(submitCall?.[0].context.formData).toMatchObject({ field1: 'prepared' });
		});
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
			<FormProvider config={testEngine.validateForm(config)} onChange={onChange}>
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

	it('ignores callbacks injected into the config at runtime', async () => {
		const configOnSubmit = vi.fn();
		const configOnChange = vi.fn();
		const onSubmit = vi.fn();
		const onChange = vi.fn();
		const injected = { ...config, onSubmit: configOnSubmit, onChange: configOnChange } as FormConfig;

		render(
			<FormProvider config={testEngine.validateForm(injected)} onSubmit={onSubmit} onChange={onChange}>
				<RegisteredInput />
				<button type="submit">Submit</button>
			</FormProvider>,
		);

		fireEvent.change(screen.getByTestId('field1'), { target: { value: 'new value' } });
		await waitFor(() => {
			expect(onChange).toHaveBeenCalled();
		});

		fireEvent.click(screen.getByText('Submit'));
		await waitFor(() => {
			expect(onSubmit).toHaveBeenCalledTimes(1);
		});

		expect(configOnChange).not.toHaveBeenCalled();
		expect(configOnSubmit).not.toHaveBeenCalled();
	});
});

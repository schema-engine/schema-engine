import { fieldText } from '@/hooks/field-text';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { FormProvider } from '../../src/components/form-provider';
import { useFormField } from '../../src/hooks/form-state';
import * as z from 'zod/mini';
import {
	type ElementConfig,
	type FormConfig,
	createFormEngine,
	defineInput,
	type BuilderActionBaseContext,
} from '@schema-engine/forms';
import { anyValue } from '../utils/any-value';

type Executed = { trigger: string; context: BuilderActionBaseContext };
const executed: Executed[] = [];
let behaviour: (executing: Executed) => void | Promise<void> = () => undefined;

/** @remarks The engine registers a bare input and a `submit` action that records what it ran and lets a test react to it. */
const testEngine = createFormEngine({
	elements: [
		defineInput({
			value: anyValue,
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
			execute: async (context: BuilderActionBaseContext & { trigger: string }) => {
				const run = { trigger: context.trigger, context };
				executed.push(run);
				await behaviour(run);
				return { success: true };
			},
		},
	],
});

vi.mock('@/hooks/use-form-context', async (importOriginal) => ({
	...(await importOriginal<typeof import('@/hooks/use-form-context')>()),
	useOptionalFormEngine: () => null,
	useFormEngine: () => ({ engine: testEngine }),
}));

function RegisteredInput() {
	const { defaultValue, fieldProps } = useFormField({
		$type: 'input',
		name: 'field1',
		id: 'field1',
	});
	return <input {...fieldProps} data-testid="field1" defaultValue={fieldText(defaultValue)} />;
}

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
		executed.length = 0;
		behaviour = () => undefined;
	});

	it('should fire form_mount on mount', async () => {
		render(
			<FormProvider config={testEngine.validateForm(config)}>
				<div>Form Content</div>
			</FormProvider>,
		);

		await waitFor(() => {
			expect(executed.map(({ trigger }) => trigger)).toContain('form_mount');
		});
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
			expect(executed.map(({ trigger }) => trigger)).toContain('form_submit');
		});
		const triggers = executed.map(({ trigger }) => trigger);
		expect(triggers.indexOf('form_submit_start')).toBeGreaterThan(-1);
		expect(triggers.indexOf('form_submit_start')).toBeLessThan(triggers.indexOf('form_submit'));
	});

	it('updates the form with a value an action writes during a submission, not the submission itself', async () => {
		behaviour = ({ trigger, context }) => {
			if (trigger === 'form_submit_start') context.form.setValue('field1', 'prepared');
		};

		render(
			<FormProvider config={testEngine.validateForm(config)}>
				<RegisteredInput />
				<button type="submit">Submit</button>
			</FormProvider>,
		);

		fireEvent.click(screen.getByText('Submit'));

		await waitFor(() => {
			const submitCall = executed.find(({ trigger }) => trigger === 'form_submit');
			expect(submitCall?.context.formData).not.toHaveProperty('field1', 'prepared');
			expect(submitCall?.context.form.getValue('field1')).toBe('prepared');
		});
	});

	it('should keep consumer onChange callbacks non-blocking when form_change actions fail', async () => {
		vi.spyOn(console, 'error').mockImplementation(() => undefined);
		vi.spyOn(console, 'warn').mockImplementation(() => undefined);
		const onChange = vi.fn(() => undefined);
		behaviour = ({ trigger }) => {
			if (trigger === 'form_change') throw new Error('form_change failed');
		};

		render(
			<FormProvider config={testEngine.validateForm(config)} onChange={onChange}>
				<RegisteredInput />
			</FormProvider>,
		);

		fireEvent.change(screen.getByTestId('field1'), { target: { value: 'new value' } });

		await waitFor(() => {
			expect(onChange).toHaveBeenCalled();
		});
	});

	it('calls the latest callbacks of the render that follows, not those of the first render', async () => {
		const first = vi.fn();
		const second = vi.fn();
		const { rerender } = render(
			<FormProvider config={testEngine.validateForm(config)} onChange={first}>
				<RegisteredInput />
			</FormProvider>,
		);
		rerender(
			<FormProvider config={testEngine.validateForm(config)} onChange={second}>
				<RegisteredInput />
			</FormProvider>,
		);

		fireEvent.change(screen.getByTestId('field1'), { target: { value: 'x' } });
		await waitFor(() => expect(second).toHaveBeenCalled());
		expect(first).not.toHaveBeenCalled();
	});

	it('does not change the form state for an error, a touch or a validation result', async () => {
		const onChange = vi.fn();
		render(
			<FormProvider config={testEngine.validateForm(config)} onChange={onChange}>
				<RegisteredInput />
			</FormProvider>,
		);
		fireEvent.blur(screen.getByTestId('field1'));
		await new Promise((resolve) => setTimeout(resolve, 20));
		expect(onChange).not.toHaveBeenCalled();
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

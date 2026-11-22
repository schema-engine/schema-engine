import { fieldText } from '@/hooks/field-text';
import { useState } from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { FormProvider } from '../../src/components/form-provider';
import { FormEngineContext } from '../../src/components/provider';
import type { FormConfig } from '@schema-engine/forms/schemas';
import { useFormContext, useFormField } from '../../src/hooks/form-state';
import { renderProvider, testEngine } from '../utils/form-harness';

const config: FormConfig = {
	id: 'validation-form',
	title: 'Validation Form',
	steps: [
		{
			id: 'step-1',
			title: 'Step 1',
			elements: [
				{
					name: 'email',
					$type: 'input',
					inputType: 'email',
					rules: [{ type: 'required', message: 'Email is required' }],
				},
			],
		},
	],
};

function ValidationProbe({ name }: { name: string }) {
	const { value, error, onChange, onBlur, ref } = useFormField({
		$type: 'input',
		name,
		id: name,
	});
	return (
		<>
			<input
				ref={ref}
				data-testid={name}
				value={fieldText(value)}
				onChange={(event) => onChange(event.target.value)}
				onBlur={onBlur}
			/>
			<span data-testid={`${name}-error`}>{error ?? ''}</span>
		</>
	);
}

function Status() {
	const { formState } = useFormContext();
	return (
		<output data-testid="status">
			{String(formState.isSubmitting)}:{formState.submitCount}
		</output>
	);
}

const asyncConfig: FormConfig = {
	...config,
	steps: [
		{
			id: 'step-1',
			title: 'Step 1',
			elements: [
				{
					name: 'email',
					$type: 'input',
					rules: [{ type: 'async', url: '/check', debounce: 0, disableCache: true }],
				},
			],
		},
	],
};

/** @remarks Mounts `first`, which sits before `second` in the document, after `second` registered its control. */
function LateFirst() {
	const [shown, show] = useState(false);
	return (
		<>
			<button type="button" onClick={() => show(true)}>
				Show first
			</button>
			{shown && <ValidationProbe name="first" />}
		</>
	);
}

describe('a submission that ends without a verdict', () => {
	it('is not counted and does not submit when an edit outruns the check and its retry', async () => {
		const onSubmit = vi.fn();
		const fetchSpy = vi
			.spyOn(globalThis, 'fetch')
			.mockImplementation(
				() =>
					new Promise((resolve) =>
						setTimeout(() => resolve(new Response(JSON.stringify({ valid: true }))), 80),
					),
			);
		renderProvider(
			asyncConfig,
			<>
				<ValidationProbe name="email" />
				<Status />
				<button type="submit">Submit</button>
			</>,
			{ defaultValues: { email: 'a@example.com' }, onSubmit },
		);

		fireEvent.click(screen.getByText('Submit'));
		await new Promise((resolve) => setTimeout(resolve, 30));
		fireEvent.change(screen.getByTestId('email'), { target: { value: 'b@example.com' } });
		await new Promise((resolve) => setTimeout(resolve, 110));
		fireEvent.change(screen.getByTestId('email'), { target: { value: 'c@example.com' } });

		await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('false:0'));
		await new Promise((resolve) => setTimeout(resolve, 200));
		expect(onSubmit).not.toHaveBeenCalled();
		expect(screen.getByTestId('status')).toHaveTextContent('false:0');
		fetchSpy.mockRestore();
	});

	it('is not counted and is no longer submitting when a rule could not run', async () => {
		const onSubmit = vi.fn();
		const fetchSpy = vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('offline'));
		vi.spyOn(console, 'error').mockImplementation(() => undefined);
		renderProvider(
			asyncConfig,
			<>
				<ValidationProbe name="email" />
				<Status />
				<button type="submit">Submit</button>
			</>,
			{ defaultValues: { email: 'a@example.com' }, onSubmit },
		);

		fireEvent.click(screen.getByText('Submit'));

		await waitFor(() => expect(fetchSpy).toHaveBeenCalled());
		await new Promise((resolve) => setTimeout(resolve, 100));
		expect(screen.getByTestId('status')).toHaveTextContent('false:0');
		expect(onSubmit).not.toHaveBeenCalled();
		fetchSpy.mockRestore();
	});
});

describe('a provider used directly', () => {
	it('starts a fresh form when it gets a new normalized config', () => {
		const view = (formConfig: FormConfig) => (
			<FormEngineContext.Provider value={{ engine: testEngine }}>
				<FormProvider
					config={testEngine.validateForm(formConfig)}
					defaultValues={{ email: 'first@example.com' }}
				>
					<ValidationProbe name="email" />
				</FormProvider>
			</FormEngineContext.Provider>
		);
		const { rerender } = render(view(config));
		fireEvent.change(screen.getByTestId('email'), { target: { value: 'edited@example.com' } });
		expect(screen.getByTestId('email')).toHaveValue('edited@example.com');

		rerender(view({ ...config, id: 'other-form' }));

		expect(screen.getByTestId('email')).toHaveValue('first@example.com');
	});
});

describe('FormProvider validation', () => {
	it('hands onSubmit the config payload with the values that passed', async () => {
		const onSubmit = vi.fn();
		renderProvider(
			{ ...config, payload: { campaign: 'spring' } },
			<>
				<ValidationProbe name="email" />
				<button type="submit">Submit</button>
			</>,
			{ onSubmit },
		);

		fireEvent.change(screen.getByTestId('email'), { target: { value: 'a@b.co' } });
		fireEvent.click(screen.getByText('Submit'));

		await waitFor(() => expect(onSubmit).toHaveBeenCalledWith({ email: 'a@b.co', campaign: 'spring' }));
	});

	it('counts a submit that failed validation and one that passed, and is submitting only while one runs', async () => {
		let release: () => void = () => undefined;
		const onSubmit = vi.fn(() => new Promise<void>((resolve) => (release = resolve)));
		renderProvider(
			config,
			<>
				<ValidationProbe name="email" />
				<Status />
				<button type="submit">Submit</button>
			</>,
			{ onSubmit },
		);
		expect(screen.getByTestId('status')).toHaveTextContent('false:0');

		fireEvent.click(screen.getByText('Submit'));
		await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('false:1'));
		expect(onSubmit).not.toHaveBeenCalled();

		fireEvent.change(screen.getByTestId('email'), { target: { value: 'a@b.co' } });
		fireEvent.click(screen.getByText('Submit'));
		await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('true:1'));
		release();
		await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('false:2'));
	});

	it('rejects an empty required field on submit', async () => {
		const onSubmit = vi.fn();
		renderProvider(
			config,
			<>
				<ValidationProbe name="email" />
				<button type="submit">Submit</button>
			</>,
			{ onSubmit },
		);

		fireEvent.click(screen.getByText('Submit'));

		await waitFor(() => {
			expect(screen.getByTestId('email-error')).toHaveTextContent('Email is required');
		});
		expect(onSubmit).not.toHaveBeenCalled();
	});

	it('focuses the first control in document order that has an error, whatever order the controls mounted in', async () => {
		renderProvider(
			{
				...config,
				steps: [
					{
						id: 'step-1',
						title: 'Step 1',
						elements: ['first', 'second'].map((name) => ({
							name,
							$type: 'input',
							rules: [{ type: 'required', message: `${name} is required` }],
						})),
					},
				],
			},
			<>
				<LateFirst />
				<ValidationProbe name="second" />
				<button type="submit">Submit</button>
			</>,
		);
		fireEvent.click(screen.getByText('Show first'));
		fireEvent.click(screen.getByText('Submit'));

		await waitFor(() => expect(screen.getByTestId('second-error')).toHaveTextContent('second is required'));
		await waitFor(() => expect(screen.getByTestId('first')).toHaveFocus());
		expect(screen.getByTestId('second')).not.toHaveFocus();
	});

	it('hands onSubmit the values that passed validation once the required field is filled', async () => {
		const onSubmit = vi.fn();
		renderProvider(
			config,
			<>
				<ValidationProbe name="email" />
				<button type="submit">Submit</button>
			</>,
			{ onSubmit },
		);

		fireEvent.change(screen.getByTestId('email'), { target: { value: 'reader@example.com' } });
		fireEvent.click(screen.getByText('Submit'));

		await waitFor(() => {
			expect(onSubmit).toHaveBeenCalledWith({ email: 'reader@example.com' });
		});
		expect(screen.getByTestId('email-error')).toHaveTextContent('');
	});

	it('submits the values of the check that passed when an edit outruns the first one', async () => {
		const onSubmit = vi.fn();
		const slow = vi
			.spyOn(globalThis, 'fetch')
			.mockImplementation(
				() =>
					new Promise((resolve) =>
						setTimeout(() => resolve(new Response(JSON.stringify({ valid: true }))), 60),
					),
			);
		renderProvider(
			{
				...config,
				steps: [
					{
						id: 'step-1',
						title: 'Step 1',
						elements: [
							{
								name: 'email',
								$type: 'input',
								rules: [{ type: 'async', url: '/check', debounce: 0, disableCache: true }],
							},
						],
					},
				],
			},
			<>
				<ValidationProbe name="email" />
				<button type="submit">Submit</button>
			</>,
			{ defaultValues: { email: 'a@example.com' }, onSubmit },
		);

		fireEvent.click(screen.getByText('Submit'));
		fireEvent.change(screen.getByTestId('email'), { target: { value: 'b@example.com' } });

		await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
		expect(onSubmit).toHaveBeenCalledWith({ email: 'b@example.com' });
		slow.mockRestore();
	});
});

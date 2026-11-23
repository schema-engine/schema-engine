import { fieldText } from '@/hooks/field-text';
import { afterEach, expect, test } from 'vitest';
import { cleanup, screen, waitFor } from '@testing-library/react';
import { userEvent } from 'vitest/browser';
import type { FormConfig } from '@schema-engine/forms/schemas';
import { useFormField } from '../../src/hooks/form-state';
import { useFormStateContext } from '../../src/hooks/form-state/context';
import { useFormInstanceActions } from '../../src/hooks/use-form-context';
import { renderProvider } from '../utils/form-harness';

afterEach(cleanup);

const config: FormConfig = {
	id: 'revalidation',
	validationMode: 'onBlur',
	steps: [
		{
			id: 'account',
			title: 'Account',
			elements: [
				{
					$type: 'input',
					id: 'password',
					name: 'password',
					rules: [
						{ $type: 'required', message: 'Password is required' },
						{ $type: 'minLength', value: 8, message: 'Use at least 8 characters' },
					],
				},
			],
		},
		{ id: 'profile', title: 'Profile', elements: [] },
	],
};

/** @remarks The error is a block above the buttons, so it leaving the page moves Next up, as a real field's error does. */
function Field() {
	const { defaultValue, error, fieldProps } = useFormField(config.steps[0].elements![0]);
	return (
		<div>
			<label>
				Password
				<input {...fieldProps} defaultValue={fieldText(defaultValue)} />
			</label>
			<p role="alert">{error ?? ''}</p>
		</div>
	);
}

function Controls() {
	const { steps, current, next } = useFormInstanceActions();
	const currentStep = steps.filter(({ skipped }) => !skipped).findIndex(({ id }) => id === current);
	const { container } = useFormStateContext();
	return (
		<>
			<button type="button" onClick={() => container.reset()}>
				Reset
			</button>
			<output aria-label="step">{currentStep}</output>
			<button type="button" onClick={() => void next()}>
				Next
			</button>
		</>
	);
}

function mount() {
	return renderProvider(
		config,
		<>
			<Field />
			<Controls />
		</>,
	);
}

test('Next advances on the first click after a failed Next and a correction, without leaving the field', async () => {
	mount();
	const next = screen.getByRole('button', { name: 'Next' });
	await userEvent.click(next);
	await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Password is required'));

	await userEvent.fill(screen.getByRole('textbox'), 'correct-horse');
	await waitFor(() => expect(screen.getByRole('alert')).toBeEmptyDOMElement());
	await userEvent.click(next);

	await waitFor(() => expect(screen.getByLabelText('step')).toHaveTextContent('1'));
});

test('a field that failed the step check reports its current error while it is edited', async () => {
	mount();
	await userEvent.click(screen.getByRole('button', { name: 'Next' }));
	await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Password is required'));

	await userEvent.fill(screen.getByRole('textbox'), 'abc');
	await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Use at least 8 characters'));
	expect(screen.getByLabelText('step')).toHaveTextContent('0');
});

test('a failed step check focuses its first invalid field and does not mark the form submitted', async () => {
	mount();
	await userEvent.click(screen.getByRole('button', { name: 'Next' }));

	await waitFor(() => expect(screen.getByRole('textbox')).toHaveFocus());
});

test('a field keeps its blur error while edited before any step check has failed', async () => {
	mount();
	const input = screen.getByRole('textbox');
	await userEvent.click(input);
	await userEvent.tab();
	await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Password is required'));

	await userEvent.fill(input, 'abc');
	await new Promise((resolve) => setTimeout(resolve, 200));
	expect(screen.getByRole('alert')).toHaveTextContent('Password is required');
});

test('a reset ends the re-validation a failed step check started', async () => {
	mount();
	await userEvent.click(screen.getByRole('button', { name: 'Next' }));
	await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Password is required'));
	await userEvent.click(screen.getByRole('button', { name: 'Reset' }));
	await waitFor(() => expect(screen.getByRole('alert')).toBeEmptyDOMElement());

	const input = screen.getByRole('textbox');
	await userEvent.click(input);
	await userEvent.tab();
	await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Password is required'));
	await userEvent.fill(input, 'abc');
	await new Promise((resolve) => setTimeout(resolve, 200));
	expect(screen.getByRole('alert')).toHaveTextContent('Password is required');
});

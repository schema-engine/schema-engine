import { afterEach, expect, test } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { userEvent } from 'vitest/browser';
import { useController } from 'react-hook-form';
import { createFormEngine } from '@schema-engine/forms';
import { FormProvider } from '../../src/adapters/rhf/form-provider';
import { FormEngineContext } from '../../src/components/provider';
import { FormAdapterContext } from '../../src/adapters/context';
import { rhfAdapter } from '../../src/adapters/react-hook-form';
import { useFormInstanceActions } from '../../src/hooks/use-form-context';
import type { FormConfig } from '@schema-engine/forms/schemas';

const engine = createFormEngine({});

afterEach(cleanup);

const config: FormConfig = {
	id: 'revalidation',
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
						{ type: 'required', message: 'Password is required' },
						{ type: 'minLength', value: 8, message: 'Use at least 8 characters' },
					],
				},
			],
		},
		{ id: 'profile', title: 'Profile', elements: [] },
	],
};

/** @remarks The error is a block above the buttons, so it leaving the page moves Next up, as a real field's error does. */
function Field() {
	const { field, fieldState } = useController({ name: 'password' });
	return (
		<div>
			<label>
				Password
				<input {...field} value={field.value ?? ''} />
			</label>
			<p role="alert">{fieldState.error?.message ?? ''}</p>
		</div>
	);
}

function Controls() {
	const { currentStep, goToNext } = useFormInstanceActions();
	return (
		<>
			<output aria-label="step">{currentStep}</output>
			<button type="button" onClick={goToNext}>
				Next
			</button>
		</>
	);
}

function mount() {
	return render(
		<FormEngineContext.Provider value={{ engine }}>
			<FormAdapterContext.Provider value={rhfAdapter}>
				<FormProvider config={config}>
					<Field />
					<Controls />
				</FormProvider>
			</FormAdapterContext.Provider>
		</FormEngineContext.Provider>,
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

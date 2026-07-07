import { describe, it, expect, beforeEach } from 'bun:test';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import type { FormConfig } from '@schema-engine/forms/schemas';
import { FormEngineProvider } from '@/components/adapter-provider';
import { FormRenderer } from '@/components/internals/form-renderer';
import { rhfAdapter } from '@/adapters/rhf';
import { setupActionExecutorMock } from '../utils/use-action-executor.mock';
import { createIntegrationTestEngine } from '../integration/test-engine';

setupActionExecutorMock();

function renderMultiStepForm(config: FormConfig) {
	const engine = createIntegrationTestEngine();

	return render(
		<FormEngineProvider engine={engine} adapter={rhfAdapter}>
			<FormRenderer config={config} />
		</FormEngineProvider>,
	);
}

describe('multi-step FormRenderer', () => {
	beforeEach(() => {
		document.body.innerHTML = '';
	});

	it('renders the default stepper and first step content', () => {
		const config: FormConfig = {
			id: 'wizard',
			title: 'Registration',
			mode: 'wizard',
			steps: [
				{
					id: 'personal',
					title: 'Personal',
					elements: [
						{
							$type: 'input',
							id: 'first-name',
							name: 'firstName',
							label: 'First Name',
							inputType: 'text',
						},
					],
				},
				{
					id: 'account',
					title: 'Account',
					elements: [
						{
							$type: 'input',
							id: 'email',
							name: 'email',
							label: 'Email',
							inputType: 'email',
						},
					],
				},
			],
			stepper: {
				$type: 'default',
			},
		};

		renderMultiStepForm(config);

		expect(screen.getByLabelText('First Name')).toBeInTheDocument();
		expect(screen.queryByLabelText('Email')).not.toBeInTheDocument();
		expect(screen.getByRole('heading', { name: 'Personal' })).toBeInTheDocument();
		expect(screen.getByRole('button', { name: 'Next' })).toBeInTheDocument();
	});

	it('navigates to the next step when Next is clicked', async () => {
		const config: FormConfig = {
			id: 'wizard-nav',
			title: 'Registration',
			mode: 'wizard',
			steps: [
				{
					id: 'personal',
					title: 'Personal',
					elements: [
						{
							$type: 'input',
							id: 'first-name',
							name: 'firstName',
							label: 'First Name',
							inputType: 'text',
							defaultValue: 'Ada',
						},
					],
				},
				{
					id: 'account',
					title: 'Account',
					elements: [
						{
							$type: 'input',
							id: 'email',
							name: 'email',
							label: 'Email',
							inputType: 'email',
						},
					],
				},
			],
			stepper: {
				$type: 'default',
			},
		};

		renderMultiStepForm(config);

		fireEvent.click(screen.getByRole('button', { name: 'Next' }));

		await waitFor(() => {
			expect(screen.getByLabelText('Email')).toBeInTheDocument();
		});

		expect(screen.queryByLabelText('First Name')).not.toBeInTheDocument();
		expect(screen.getByRole('button', { name: 'Previous' })).toBeInTheDocument();
	});
});

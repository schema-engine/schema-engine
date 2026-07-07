import { describe, it, expect, beforeEach } from 'bun:test';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import type { FormConfig } from '@schema-engine/forms/schemas';
import { FormEngineProvider } from '@/components/adapter-provider';
import { FormRenderer } from '@/components/internals/form-renderer';
import { rhfAdapter } from '@/adapters/rhf';
import { setupActionExecutorMock } from '../utils/use-action-executor.mock';
import { createIntegrationTestEngine } from './test-engine';

setupActionExecutorMock();

function renderForm(config: FormConfig) {
	const engine = createIntegrationTestEngine();

	return render(
		<FormEngineProvider engine={engine} adapter={rhfAdapter}>
			<FormRenderer config={config} />
		</FormEngineProvider>,
	);
}

describe('FormRenderer integration', () => {
	beforeEach(() => {
		document.body.innerHTML = '';
	});

	it('renders a single-step form with registered input elements', () => {
		const config: FormConfig = {
			id: 'single-step',
			title: 'Contact',
			steps: [
				{
					id: 'step-1',
					title: 'Details',
					elements: [
						{
							$type: 'input',
							id: 'name',
							name: 'name',
							label: 'Full Name',
							inputType: 'text',
						},
					],
				},
			],
		};

		renderForm(config);

		expect(screen.getByLabelText('Full Name')).toBeInTheDocument();
	});

	it('renders an element error when the registration is missing', () => {
		const config: FormConfig = {
			id: 'missing-registration',
			title: 'Broken Form',
			steps: [
				{
					id: 'step-1',
					title: 'Step 1',
					elements: [
						{
							$type: 'unknown-widget',
							id: 'widget',
							name: 'widget',
						} as FormConfig['steps'][number]['elements'][number],
					],
				},
			],
		};

		renderForm(config);

		expect(screen.getByText('Component not found')).toBeInTheDocument();
		expect(
			screen.getByText('The component type "unknown-widget" is not registered in the form engine.'),
		).toBeInTheDocument();
	});

	it('applies constraint logic to show and hide dependent fields', async () => {
		const config: FormConfig = {
			id: 'constraints',
			title: 'Constraints',
			steps: [
				{
					id: 'step-1',
					title: 'Step 1',
					elements: [
						{
							$type: 'input',
							id: 'status',
							name: 'status',
							label: 'Status',
							inputType: 'text',
							defaultValue: 'inactive',
						},
						{
							$type: 'input',
							id: 'detail',
							name: 'detail',
							label: 'Detail',
							inputType: 'text',
							constraints: [
								{
									field: 'status',
									operator: 'equals',
									value: 'active',
									action: 'show',
								},
							],
						},
					],
				},
			],
		};

		renderForm(config);

		expect(screen.queryByLabelText('Detail')).not.toBeInTheDocument();

		fireEvent.change(screen.getByLabelText('Status'), { target: { value: 'active' } });

		await waitFor(() => {
			expect(screen.getByLabelText('Detail')).toBeInTheDocument();
		});
	});
});

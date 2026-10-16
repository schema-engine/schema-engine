import { render, screen, waitFor } from '@testing-library/react';
import { useState } from 'react';
import { userEvent } from 'vitest/browser';
import { describe, expect, test, vi } from 'vitest';
import * as z from 'zod/mini';
import type { BuilderActionExecutionContext, BuilderActionRegistration } from '@schema-engine/forms';
import { ArrayElementRegistration } from '@/components/schema-engine/forms/inputs/form-array-elements.registration';
import { InputElementRegistration } from '@/components/schema-engine/forms/inputs/form-input.registration';
import { WizardRecipe } from '@/components/schema-engine/forms/recipes/registrations/wizard';
import { createFormEngine } from '@schema-engine/forms';
import { FormRenderer } from '@/components/internals/form-renderer';
import { rhfAdapter } from '@/adapters/react-hook-form';

const actionSchema = z.object({
	$type: z.literal('record-change'),
	id: z.string(),
});

function createEngine(onAction?: () => void) {
	const recordChange: BuilderActionRegistration<'record-change', typeof actionSchema> = {
		$type: 'record-change',
		schema: actionSchema,
		metadata: {
			name: 'Record change',
			defaultTriggers: ['form_change'],
		},
		execute: async (_context: BuilderActionExecutionContext<z.output<typeof actionSchema>>) => {
			onAction?.();
			return { success: true };
		},
	};

	return createFormEngine({
		elements: [InputElementRegistration, ArrayElementRegistration],
		actions: [recordChange],
		recipes: [WizardRecipe],
	});
}

describe('FormRenderer state boundaries', () => {
	test('a sibling constraint evaluates per array row', async () => {
		const engine = createEngine();
		const config = engine.defineForm({
			id: 'contacts',
			steps: [
				{
					id: 'main',
					title: 'Main',
					elements: [
						{
							$type: 'arrayElements',
							id: 'contacts',
							name: 'contacts',
							elements: [
								{ $type: 'input', id: 'account-type', name: 'accountType', label: 'Account type' },
								{
									$type: 'input',
									id: 'email',
									name: 'email',
									label: 'Email',
									constraints: [
										{ field: 'accountType', operator: 'equals', value: 'business', action: 'show' },
									],
								},
							],
						},
					],
				},
			],
		});

		render(
			<FormRenderer
				config={config}
				defaultValues={{ contacts: [{ accountType: '' }, { accountType: '' }] }}
				engine={engine}
				adapter={rhfAdapter}
			/>,
		);

		const accountTypes = screen.getAllByRole('textbox', { name: 'Account type' });
		await userEvent.type(accountTypes[0], 'business');

		await waitFor(() => {
			expect(screen.getAllByRole('textbox', { name: 'Email' })).toHaveLength(1);
		});
		expect(screen.getByRole('textbox', { name: 'Email' })).toHaveAttribute('name', 'contacts.0.email');
		expect(screen.getAllByRole('textbox', { name: 'Account type' })).toHaveLength(2);
	});

	test('a new config starts a new form instance with its defaults', async () => {
		const engine = createEngine();
		const firstConfig = engine.defineForm({
			id: 'registration',
			view: { $type: 'wizard', actions: { showStepCounter: true } },
			steps: [
				{
					id: 'one',
					title: 'One',
					elements: [{ $type: 'input', id: 'first-field', name: 'first', label: 'First' }],
				},
				{ id: 'two', title: 'Two', elements: [{ $type: 'input', name: 'second', label: 'Second' }] },
				{ id: 'three', title: 'Three', elements: [{ $type: 'input', name: 'third', label: 'Third' }] },
			],
		});
		const secondConfig = engine.defineForm({
			id: 'registration',
			view: { $type: 'wizard', actions: { showStepCounter: true } },
			steps: [
				{
					id: 'new-one',
					title: 'New one',
					elements: [{ $type: 'input', id: 'first-field', name: 'first', label: 'First' }],
				},
				{ id: 'new-two', title: 'New two', elements: [{ $type: 'input', name: 'second', label: 'Second' }] },
			],
		});

		const view = render(
			<FormRenderer
				config={firstConfig}
				defaultValues={{ first: 'old default' }}
				engine={engine}
				adapter={rhfAdapter}
			/>,
		);

		await userEvent.click(screen.getByRole('button', { name: 'Go to next step' }));
		await waitFor(() => expect(screen.getByText('Step 2 of 3')).toBeInTheDocument());
		await userEvent.click(screen.getByRole('button', { name: 'Go to next step' }));
		await waitFor(() => expect(screen.getByText('Step 3 of 3')).toBeInTheDocument());

		view.rerender(
			<FormRenderer
				config={secondConfig}
				defaultValues={{ first: 'new default' }}
				engine={engine}
				adapter={rhfAdapter}
			/>,
		);

		await waitFor(() => {
			expect(screen.getByText('Step 1 of 2')).toBeInTheDocument();
			expect(screen.getByRole('textbox', { name: 'First' })).toHaveValue('new default');
		});
	});

	test('parent renders do not emit form changes or form_change actions', async () => {
		const action = vi.fn();
		const onChange = vi.fn();
		const engine = createEngine(action);
		const config = engine.defineForm({
			id: 'watched-form',
			actions: [{ $type: 'record-change', id: 'record-change' }],
			steps: [
				{
					id: 'main',
					title: 'Main',
					elements: [{ $type: 'input', id: 'name', name: 'name', label: 'Name' }],
				},
			],
		});

		function Parent() {
			const [renderCount, setRenderCount] = useState(0);

			return (
				<>
					<button type="button" onClick={() => setRenderCount((count) => count + 1)}>
						Render parent
					</button>
					<output aria-label="Parent renders">{renderCount}</output>
					<FormRenderer
						config={config}
						engine={engine}
						adapter={rhfAdapter}
						onChange={(values) => onChange(values)}
					/>
				</>
			);
		}

		render(<Parent />);
		await userEvent.type(screen.getByRole('textbox', { name: 'Name' }), 'Ada');
		await waitFor(() => {
			expect(onChange).toHaveBeenCalled();
			expect(action).toHaveBeenCalled();
		});
		const onChangeCalls = onChange.mock.calls.length;
		const actionCalls = action.mock.calls.length;

		await userEvent.click(screen.getByRole('button', { name: 'Render parent' }));

		await waitFor(() => expect(screen.getByLabelText('Parent renders')).toHaveTextContent('1'));
		expect(onChange).toHaveBeenCalledTimes(onChangeCalls);
		expect(action).toHaveBeenCalledTimes(actionCalls);
	});
});

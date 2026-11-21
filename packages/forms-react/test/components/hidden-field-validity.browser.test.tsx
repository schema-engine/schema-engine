import { expect, test } from 'vitest';
import { render, getByRole } from '@testing-library/react';
import { userEvent } from 'vitest/browser';
import * as z from 'zod/mini';
import { createFormEngine } from '@schema-engine/forms';
import { FormRenderer } from '@/components/internals/form-renderer';
import { rhfAdapter } from '@/adapters/react-hook-form';
import { InputElementRegistration } from '@/components/schema-engine/forms/inputs/form-input.registration';
import { SubmitButtonElementRegistration } from '@/components/schema-engine/forms/actions/submit-button.registration';
import { schemaFormRecipeRegistrations } from '@/components/schema-engine/forms/recipes/registrations';

test('checkValidity agrees with a submission about a field a constraint hides', async () => {
	const checks: Array<Promise<boolean>> = [];
	let submissions = 0;
	const probe = {
		$type: 'probe',
		schema: z.object({ id: z.string(), $type: z.literal('probe'), triggers: z.optional(z.array(z.string())) }),
		metadata: { name: 'Probe' },
		execute: async (context: { form: { checkValidity: () => Promise<boolean> } }) => {
			checks.push(context.form.checkValidity());
			return { success: true };
		},
	};
	const engine = createFormEngine({
		elements: [InputElementRegistration, SubmitButtonElementRegistration],
		recipes: [...schemaFormRecipeRegistrations],
		actions: [probe],
	});
	const config = engine.validateForm({
		id: 'hidden-field',
		steps: [
			{
				id: 'main',
				title: 'Main',
				elements: [
					{ $type: 'input', id: 'kind', name: 'kind', label: 'Kind' },
					{
						$type: 'input',
						id: 'company',
						name: 'company',
						label: 'Company',
						rules: [{ type: 'required', message: 'Company is required' }],
						constraints: [{ field: 'kind', operator: 'equals', value: 'business', action: 'show' }],
					},
					{ $type: 'submit', id: 'submit', name: 'submit', label: 'Submit' },
				],
			},
		],
		actions: [{ id: 'probe', $type: 'probe', triggers: ['form_change'] }],
	});
	const { container } = render(
		<FormRenderer
			config={config}
			engine={engine}
			adapter={rhfAdapter}
			onSubmit={() => {
				submissions += 1;
			}}
		/>,
	);

	await userEvent.type(getByRole(container, 'textbox', { name: /^Kind/ }), 'x');
	await expect.poll(() => checks.length).toBeGreaterThan(0);
	await userEvent.click(getByRole(container, 'button', { name: /submit/i }));
	await expect.poll(() => submissions).toBe(1);

	await expect(checks.at(-1)).resolves.toBe(true);
});

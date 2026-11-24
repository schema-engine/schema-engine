import { render, screen } from '@testing-library/react';
import { userEvent } from 'vitest/browser';
import { describe, expect, test, vi } from 'vitest';
import * as z from 'zod/mini';
import { createFormEngine, type BuilderActionRegistration } from '@schema-engine/forms';
import { FormRenderer } from '@/components/internals/form-renderer';
import { InputElementRegistration } from '@/components/schema-engine/forms/inputs/form-input.registration';
import { SubmitButtonElementRegistration } from '@/components/schema-engine/forms/actions/submit-button.registration';

const redirectSchema = z.object({});

const redirectAction: BuilderActionRegistration<'redirect', typeof redirectSchema> = {
	$type: 'redirect',
	schema: redirectSchema,
	metadata: { name: 'Redirect', defaultTriggers: ['form_submit'] },
	execute: async () => ({ success: true, redirectUrl: '/thanks' }),
};

describe('the redirectUrl of a submit action', () => {
	test('is handed to the navigate prop once the submission succeeded', async () => {
		const engine = createFormEngine({
			elements: [InputElementRegistration, SubmitButtonElementRegistration],
			actions: [redirectAction],
		});
		const config = engine.validateForm({
			id: 'redirect',
			steps: [
				{
					id: 'main',
					title: 'Main',
					elements: [
						{ $type: 'input', id: 'email', name: 'email', label: 'Email' },
						{ $type: 'submit', id: 'submit', name: 'submit', label: 'Send' },
					],
				},
			],
			actions: [{ $type: 'redirect', id: 'go' }],
		});
		const navigate = vi.fn();
		render(<FormRenderer config={config} engine={engine} navigate={navigate} />);

		await userEvent.click(screen.getByRole('button', { name: 'Send' }));

		await vi.waitFor(() => expect(navigate).toHaveBeenCalledExactlyOnceWith('/thanks'));
	});
});

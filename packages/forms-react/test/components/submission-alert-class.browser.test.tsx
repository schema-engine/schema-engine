import { render, screen } from '@testing-library/react';
import { userEvent } from 'vitest/browser';
import { expect, test } from 'vitest';
import { createFormEngine } from '@schema-engine/forms';
import { FormRenderer } from '@/components/internals/form-renderer';
import { rhfAdapter } from '@/adapters/react-hook-form';
import { InputElementRegistration } from '@/components/schema-engine/forms/inputs/form-input.registration';
import { SubmitButtonElementRegistration } from '@/components/schema-engine/forms/actions/submit-button.registration';
import { SubmissionAlertElementRegistration } from '@/components/schema-engine/forms/content/form-submission-alert.registration';

test('the submission alert renders the field class once', async () => {
	const engine = createFormEngine({
		elements: [InputElementRegistration, SubmitButtonElementRegistration, SubmissionAlertElementRegistration],
	});
	const config = engine.validateForm({
		id: 'alert-class',
		steps: [
			{
				id: 'main',
				title: 'Main',
				elements: [
					{ $type: 'input', id: 'email', name: 'email', label: 'Email' },
					{ $type: 'submission-alert', id: 'status', name: 'status', className: 'author-alert' },
					{ $type: 'submit', id: 'submit', name: 'submit', label: 'Send' },
				],
			},
		],
	});
	render(<FormRenderer config={config} engine={engine} adapter={rhfAdapter} onSubmit={() => undefined} />);

	await userEvent.click(screen.getByRole('button', { name: 'Send' }));
	const alert = await screen.findByRole('alert');

	const occurrences = (alert.getAttribute('class') ?? '').split(/\s+/).filter((name) => name === 'author-alert');
	expect(occurrences).toHaveLength(1);
});

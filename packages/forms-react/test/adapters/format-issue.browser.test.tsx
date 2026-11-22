import { afterEach, describe, expect, test } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { userEvent } from 'vitest/browser';
import { createFormEngine } from '@schema-engine/forms';
import type { FormIssueFormatter } from '@schema-engine/forms/state-container';
import { FormRenderer } from '@/components/internals/form-renderer';
import { InputElementRegistration } from '@/components/schema-engine/forms/inputs/form-input.registration';
import { SubmitButtonElementRegistration } from '@/components/schema-engine/forms/actions/submit-button.registration';
import { SubmissionAlertElementRegistration } from '@/components/schema-engine/forms/content/form-submission-alert.registration';

afterEach(cleanup);

const engine = createFormEngine({
	elements: [InputElementRegistration, SubmitButtonElementRegistration, SubmissionAlertElementRegistration],
});
const authored = {
	id: 'texts',
	steps: [
		{
			id: 'main',
			title: 'Main',
			elements: [
				{ $type: 'input', id: 'code', name: 'code', label: 'Code', rules: [{ type: 'minLength', value: 8 }] },
				{
					$type: 'input',
					id: 'note',
					name: 'note',
					label: 'Note',
					rules: [{ type: 'required', message: 'Write a note' }],
				},
				{ $type: 'submission-alert', id: 'status', name: 'status', showOn: ['error'] },
				{ $type: 'submit', id: 'send', name: 'send', label: 'Send' },
			],
		},
	],
};
const config = engine.validateForm(authored);
const translate: FormIssueFormatter = (issue, { path }) =>
	`${path}: ${issue.type} ${JSON.stringify(issue.params ?? {})}`;

async function submitWith(ui: React.ReactNode) {
	render(ui);
	await userEvent.fill(screen.getByRole('textbox', { name: /^Code/ }), 'abc');
	await userEvent.keyboard('{Enter}');
}

describe('issue text', () => {
	test('the formatter of a form says each issue, and the author message is its fallback', async () => {
		await submitWith(
			<FormRenderer
				config={config}
				engine={engine}
				formatIssue={(issue, field) => (issue.type === 'required' ? '' : translate(issue, field))}
			/>,
		);

		expect(await screen.findByText('code: minLength {"minLength":8}')).toBeVisible();
		expect(await screen.findByText('Write a note')).toBeVisible();
	});

	test('the formatter of the engine is the default, and the formatter of the form outranks it', async () => {
		const engineFormatted = createFormEngine({
			elements: [InputElementRegistration, SubmitButtonElementRegistration, SubmissionAlertElementRegistration],
			formatIssue: () => 'from the engine',
		});
		const formConfig = engineFormatted.validateForm(authored);
		await submitWith(<FormRenderer config={formConfig} engine={engineFormatted} />);
		expect(await screen.findAllByText('from the engine')).not.toHaveLength(0);
		cleanup();

		await submitWith(<FormRenderer config={formConfig} engine={engineFormatted} formatIssue={translate} />);
		expect(await screen.findByText('code: minLength {"minLength":8}')).toBeVisible();
		expect(screen.queryByText('from the engine')).toBeNull();
	});

	test('with no formatter an issue without a message shows nothing, and never its rule type', async () => {
		await submitWith(<FormRenderer config={config} engine={engine} />);

		expect(await screen.findByText('Write a note')).toBeVisible();
		expect(screen.queryByText(/minLength/)).toBeNull();
		expect(screen.getByRole('textbox', { name: /^Code/ })).toHaveAttribute('aria-invalid', 'true');
	});
});

describe('submission failure text', () => {
	async function failToSubmit(ui: React.ReactNode) {
		render(ui);
		await userEvent.fill(screen.getByRole('textbox', { name: /^Code/ }), 'abcdefgh');
		await userEvent.fill(screen.getByRole('textbox', { name: /^Note/ }), 'hello');
		await userEvent.click(screen.getByRole('button', { name: 'Send' }));
	}

	test('goes through the formatter of the form as a submission issue of the form itself', async () => {
		await failToSubmit(
			<FormRenderer
				config={config}
				engine={engine}
				formatIssue={translate}
				onSubmit={() => {
					throw new Error('The server said no');
				}}
			/>,
		);

		expect(await screen.findByText('__root__: callbackFailed {}')).toBeVisible();
		expect(screen.queryByText('The server said no')).toBeNull();
	});

	test('shows the text the failure carried when there is no formatter', async () => {
		await failToSubmit(
			<FormRenderer
				config={config}
				engine={engine}
				onSubmit={() => {
					throw new Error('The server said no');
				}}
			/>,
		);

		expect(await screen.findByText('The server said no')).toBeVisible();
	});

	test('falls back to the error message of the alert when there is no text at all', async () => {
		await failToSubmit(
			<FormRenderer
				config={config}
				engine={engine}
				onSubmit={() => {
					throw 'not an error';
				}}
			/>,
		);

		expect(await screen.findByText('An error occurred during submission')).toBeVisible();
	});
});

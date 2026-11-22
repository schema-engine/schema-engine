import { afterEach, describe, expect, test } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { userEvent } from 'vitest/browser';
import { createFormEngine } from '@schema-engine/forms';
import type { FormIssueFormatter } from '@schema-engine/forms/state-container';
import { FormEngineProvider } from '@/components/form-engine-provider';
import { FormRenderer } from '@/components/internals/form-renderer';
import { InputElementRegistration } from '@/components/schema-engine/forms/inputs/form-input.registration';
import { SubmitButtonElementRegistration } from '@/components/schema-engine/forms/actions/submit-button.registration';

afterEach(cleanup);

const engine = createFormEngine({ elements: [InputElementRegistration, SubmitButtonElementRegistration] });
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
	test('an app-wide formatter on FormEngineProvider says each issue, and the author message is its fallback', async () => {
		await submitWith(
			<FormEngineProvider
				engine={engine}
				formatIssue={(issue, field) => (issue.type === 'required' ? '' : translate(issue, field))}
			>
				<FormRenderer config={config} />
			</FormEngineProvider>,
		);

		expect(await screen.findByText('code: minLength {"minLength":8}')).toBeVisible();
		expect(await screen.findByText('Write a note')).toBeVisible();
	});

	test('the formatter of a form outranks the one of the provider', async () => {
		await submitWith(
			<FormEngineProvider engine={engine} formatIssue={() => 'from the provider'}>
				<FormRenderer config={config} formatIssue={translate} />
			</FormEngineProvider>,
		);

		expect(await screen.findByText('code: minLength {"minLength":8}')).toBeVisible();
		expect(screen.queryByText('from the provider')).toBeNull();
	});

	test('the formatter of the engine is the default, and the provider and the form outrank it', async () => {
		const engineFormatted = createFormEngine({
			elements: [InputElementRegistration, SubmitButtonElementRegistration],
			formatIssue: () => 'from the engine',
		});
		const formConfig = engineFormatted.validateForm(authored);
		await submitWith(<FormRenderer config={formConfig} engine={engineFormatted} />);
		expect(await screen.findAllByText('from the engine')).not.toHaveLength(0);
		cleanup();

		await submitWith(
			<FormEngineProvider engine={engineFormatted} formatIssue={() => 'from the provider'}>
				<FormRenderer config={formConfig} />
			</FormEngineProvider>,
		);
		expect(await screen.findAllByText('from the provider')).not.toHaveLength(0);
		expect(screen.queryByText('from the engine')).toBeNull();
	});

	test('with no formatter an issue without a message shows nothing, and never its rule type', async () => {
		await submitWith(<FormRenderer config={config} engine={engine} />);

		expect(await screen.findByText('Write a note')).toBeVisible();
		expect(screen.queryByText(/minLength/)).toBeNull();
		expect(screen.getByRole('textbox', { name: /^Code/ })).toHaveAttribute('aria-invalid', 'true');
	});
});

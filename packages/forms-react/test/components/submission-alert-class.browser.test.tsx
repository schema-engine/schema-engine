import { render, screen } from '@testing-library/react';
import { userEvent } from 'vitest/browser';
import { describe, expect, test } from 'vitest';
import * as z from 'zod/mini';
import { createFormEngine, type BuilderActionRegistration } from '@schema-engine/forms';
import { FormRenderer } from '@/components/internals/form-renderer';
import { InputElementRegistration } from '@/components/schema-engine/forms/inputs/form-input.registration';
import { SubmitButtonElementRegistration } from '@/components/schema-engine/forms/actions/submit-button.registration';
import { SubmissionAlertElementRegistration } from '@/components/schema-engine/forms/content/form-submission-alert.registration';

const gateSchema = z.object({});

/**
 * A submit action that fails, or never settles, so the alert reaches its error and pending states.
 *
 * @remarks A success needs no action: a submit with none succeeds.
 */
const gateAction: BuilderActionRegistration<'gate', typeof gateSchema> = {
	$type: 'gate',
	schema: gateSchema,
	metadata: { name: 'Gate' },
	execute: async (context) =>
		context.config.id === 'hang'
			? new Promise<never>(() => undefined)
			: { success: false, shouldContinue: false, error: 'Blocked' },
};

function renderAlert(showOn: string[], actionId?: string) {
	const engine = createFormEngine({
		elements: [InputElementRegistration, SubmitButtonElementRegistration, SubmissionAlertElementRegistration],
		actions: [gateAction],
	});
	const config = engine.validateForm({
		id: 'alert-class',
		steps: [
			{
				id: 'main',
				title: 'Main',
				elements: [
					{ $type: 'input', id: 'email', name: 'email', label: 'Email' },
					{ $type: 'submission-alert', id: 'status', name: 'status', className: 'author-alert', showOn },
					{ $type: 'submit', id: 'submit', name: 'submit', label: 'Send' },
				],
			},
		],
		actions: actionId ? [{ $type: 'gate', id: actionId, triggers: ['form_submit'] }] : [],
	});
	render(<FormRenderer config={config} engine={engine} onSubmit={() => undefined} />);
}

/** @remarks `classList` collapses a repeated class, so the attribute is counted. */
const occurrences = (element: HTMLElement) =>
	(element.getAttribute('class') ?? '').split(/\s+/).filter((name) => name === 'author-alert');

describe('the submission alert renders the field class once', () => {
	test.each([
		['success', ['success'], undefined],
		['error', ['error'], 'fail'],
		['submitting', ['submitting'], 'hang'],
	])('in the %s state', async (_state, showOn, actionId) => {
		renderAlert(showOn, actionId);
		await userEvent.click(screen.getByRole('button', { name: 'Send' }));
		const alert = await screen.findByRole('alert');
		expect(occurrences(alert)).toHaveLength(1);
	});
});

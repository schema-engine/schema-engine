import { describe, expect, test, vi } from 'vitest';
import type { FormSubmitHelpers } from '@schema-engine/forms';
import { survey } from './config';
import { engine as reactEngine } from './branching-survey.react';
import { engine as radiantEngine } from './branching-survey.radiant';
import { sendAnswers } from './submit';

describe('the survey config', () => {
	test.each([
		['React', reactEngine],
		['Radiant', radiantEngine],
	])(
		'is a valid three-step form in the %s engine, and the follow-up step has its constraint',
		(_renderer, engine) => {
			const result = engine.safeValidateForm(survey);
			expect(result.success && result.data.steps.map((step) => step.id)).toEqual([
				'experience',
				'problem',
				'comments',
			]);
			expect(result.success && result.data.steps[1]?.constraints).toEqual([
				{ field: 'satisfaction', operator: 'equals', value: 'poor', $type: 'show' },
			]);
		},
	);

	test('a constraint on the first step is a config issue, because nothing comes before it', () => {
		const [first, ...rest] = survey.steps;
		const result = reactEngine.safeValidateForm({
			...survey,
			steps: [
				{
					...first!,
					constraints: [{ field: 'satisfaction', operator: 'equals', value: 'poor', $type: 'show' }],
				},
				...rest,
			],
		});
		expect(result.success).toBe(false);
	});
});

describe('sendAnswers', () => {
	test('posts the values as JSON', async () => {
		const fetch = vi.fn(async () => new Response(null, { status: 201 }));
		await sendAnswers({ name: 'Ada', satisfaction: 'great' }, { fetch } as unknown as FormSubmitHelpers);
		expect(fetch).toHaveBeenCalledWith('/api/surveys', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ name: 'Ada', satisfaction: 'great' }),
		});
	});

	test('a failure throws, so the form reports a failed submission', async () => {
		const fetch = vi.fn(async () => new Response(null, { status: 500 }));
		await expect(sendAnswers({}, { fetch } as unknown as FormSubmitHelpers)).rejects.toThrow(
			'The server answered 500.',
		);
	});
});

describe('the notice of the survey', () => {
	test.each([
		['React', reactEngine],
		['Radiant', radiantEngine],
	])(
		'is a show_notification action that runs after a successful submission, and the %s engine registers it',
		(_renderer, engine) => {
			const result = engine.safeValidateForm(survey);
			expect(result.success && result.data.actions).toMatchObject([
				{
					$type: 'show_notification',
					message: 'Thanks for your answers.',
					variant: 'success',
					triggers: ['form_submit_success'],
				},
			]);
		},
	);
});

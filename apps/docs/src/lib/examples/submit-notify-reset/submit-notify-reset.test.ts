import { describe, expect, test } from 'vitest';
import { createFormEngine } from '@schema-engine/forms';
import { newsletter } from './config';
import { engine as reactEngine } from './submit-notify-reset.react';
import { engine as radiantEngine } from './submit-notify-reset.radiant';

describe('the newsletter config', () => {
	test.each([
		['React', reactEngine],
		['Radiant', radiantEngine],
	])('is a valid form in the %s engine, with its four actions', (_renderer, engine) => {
		const result = engine.safeValidateForm(newsletter);
		expect(result.success && result.data.actions?.flat().map((action) => action.$type)).toEqual([
			'submit',
			'show_notification',
			'reset',
			'show_notification',
		]);
	});

	test('an action nobody registered is a config issue at its path, not a failure at submit time', () => {
		const withoutActions = createFormEngine({ elements: [], actions: [] });
		const result = withoutActions.safeValidateForm({ ...newsletter, steps: [] });
		expect(result.success).toBe(false);
		expect(!result.success && result.issues.some((issue) => issue.path?.[0] === 'actions')).toBe(true);
	});
});

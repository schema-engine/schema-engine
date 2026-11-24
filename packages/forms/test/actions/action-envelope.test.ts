import { describe, expect, test } from 'vitest';
import { createFormEngine } from '@/engine/create-form-engine';
import { SubmitActionRegistration } from '@/actions/plugins/form-submit.registration';

const engine = createFormEngine({ actions: [SubmitActionRegistration] });

function validate(action: Record<string, unknown>) {
	return engine.safeValidateForm({
		id: 'contact',
		steps: [{ id: 'main', title: 'Main', elements: [] }],
		actions: [{ $type: 'submit', endpoint: '/api', ...action }],
	});
}

describe('the keys every action entry carries', () => {
	test('an entry names its id, and the trigger names a form dispatches', () => {
		expect(validate({ id: 'send', triggers: ['form_submit'], enabled: false }).success).toBe(true);
		expect(validate({}).success).toBe(false);
	});

	test.each(['step_submit', 'step_view'])('rejects the %s trigger, which no renderer dispatches', (trigger) => {
		const result = validate({ id: 'send', triggers: [trigger] });

		expect(result.success).toBe(false);
		if (result.success) return;
		expect(result.issues.map((issue) => issue.path)).toEqual([['actions', 0, 'triggers', 0]]);
	});

	test('keeps enabled and triggers off the parsed entry when the author left them out', () => {
		const result = validate({ id: 'send' });

		if (!result.success) throw new Error('expected the form to validate');
		expect(result.data.actions?.[0]).toEqual({
			id: 'send',
			$type: 'submit',
			endpoint: '/api',
			method: 'POST',
		});
	});

	test('lists them in the JSON Schema of the action, beside its own arguments', () => {
		const document = engine.generateActionConfigSchema('submit') as unknown as {
			$defs: Record<string, { properties: Record<string, { const?: string; description?: string }> }>;
		};
		const { properties } = document.$defs['action:submit'];

		expect(Object.keys(properties)).toEqual(
			expect.arrayContaining(['$type', 'enabled', 'endpoint', 'id', 'method', 'triggers']),
		);
		expect(properties.$type.const).toBe('submit');
		expect(properties.enabled.description).toBe('Whether this action runs. Defaults to true.');
	});
});

import { describe, expect, test } from 'vitest';
import { docsReactFormEngine } from '../src/components/react-form-demo/demo-engine';
import { CelebrateActionSchema } from '../src/lib/docs-celebrate-action';
import { contactFormConfig } from '../src/lib/form-configs/homepage-contact';
import { formEngine } from '../src/lib/form-engine-setup';

describe('the celebrate action schema', () => {
	test('accepts its own arguments and defaults the particle count', () => {
		expect(CelebrateActionSchema.safeParse({}).data).toEqual({ particleCount: 120 });
		expect(CelebrateActionSchema.safeParse({ description: 'Confetti', particleCount: 40 }).success).toBe(true);
	});

	test('rejects an unknown argument and a count out of range', () => {
		expect(CelebrateActionSchema.safeParse({ particles: 40 }).success).toBe(false);
		expect(CelebrateActionSchema.safeParse({ particleCount: 0 }).success).toBe(false);
		expect(CelebrateActionSchema.safeParse({ particleCount: 501 }).success).toBe(false);
		expect(CelebrateActionSchema.safeParse({ particleCount: 1.5 }).success).toBe(false);
	});
});

describe('the docs engines', () => {
	const config = {
		id: 'celebration',
		steps: [{ id: 'step', title: 'Step', elements: [{ $type: 'submit', id: 'go', name: 'go', label: 'Go' }] }],
		actions: [{ id: 'party', $type: 'celebrate', particleCount: 40, triggers: ['form_submit_success'] }],
	};

	test.each([
		['Radiant', formEngine],
		['React', docsReactFormEngine],
	])('register celebrate once, for the %s demos', (_name, engine) => {
		expect(() => engine.validateForm(config)).not.toThrow();
	});
});

describe('the homepage hero form', () => {
	test('is accepted by the Radiant docs engine it renders with', () => {
		expect(() => formEngine.validateForm(contactFormConfig)).not.toThrow();
	});

	test('names celebrate and a success toast on form_submit_success, and no inline success message', () => {
		const { actions } = contactFormConfig;
		const onSuccess = actions.filter(
			(action) => 'triggers' in action && action.triggers?.includes('form_submit_success'),
		);
		expect(onSuccess.map((action) => action.$type)).toEqual(['show_notification', 'celebrate', 'reset']);
		expect(JSON.stringify(contactFormConfig)).not.toContain('successMessage');
	});

	test('is rejected by an engine when celebrate carries an unknown argument', () => {
		const misspelled = {
			...contactFormConfig,
			actions: [...contactFormConfig.actions, { id: 'typo', $type: 'celebrate', particles: 3 }],
		};
		expect(() => formEngine.validateForm(misspelled)).toThrow();
	});
});

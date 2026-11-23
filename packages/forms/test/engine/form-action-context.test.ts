import { afterEach, describe, expect, test, vi } from 'vitest';
import { buildFormActionContext } from '@/index';

const form = {
	reset: () => undefined,
	setValue: () => undefined,
	getValue: () => undefined,
	validate: async () => ({ outcome: 'passed' as const }),
	checkValidity: async () => true,
};
const fetch = async () => new Response(null);

describe('buildFormActionContext', () => {
	afterEach(() => {
		vi.useRealTimers();
	});

	test('keeps a step start time stable, then advances it when the active step changes', () => {
		vi.useFakeTimers();
		vi.setSystemTime(1_000);
		const input = {
			config: { id: 'contact' },
			values: { email: 'person@example.com' },
			formState: { isValid: true, errors: {}, touched: { email: true }, submitCount: 2 },
			step: { id: 'first', position: 0, total: 2 },
			mountedAt: 900,
			form,
			fetch,
		};

		const first = buildFormActionContext(input);
		vi.advanceTimersByTime(50);
		const sameStep = buildFormActionContext(input);
		const nextStep = buildFormActionContext({ ...input, step: { id: 'second', position: 1, total: 2 } });

		expect(first.formData).toEqual(input.values);
		expect([first.stepId, first.currentStep, first.totalSteps]).toEqual(['first', 0, 2]);
		expect([nextStep.stepId, nextStep.currentStep, nextStep.totalSteps]).toEqual(['second', 1, 2]);
		expect(first.metadata).toEqual({ stepStartTime: 900, totalFormTime: 100, userInteractions: 3 });
		expect(sameStep.metadata.stepStartTime).toBe(900);
		expect(nextStep.metadata).toEqual({ stepStartTime: 1_050, totalFormTime: 150, userInteractions: 3 });
	});

	test('counts each touched field by path as one interaction', () => {
		const context = buildFormActionContext({
			config: { id: 'contact' },
			values: {},
			formState: {
				isValid: true,
				errors: {},
				touched: {
					'address.street': true,
					'address.city': true,
					'address.zip': false,
					'contacts.0.email': true,
				},
				submitCount: 1,
			},
			step: { id: 'main', position: 0, total: 1 },
			mountedAt: 1_800,
			form,
			fetch,
		});

		expect(context.metadata.userInteractions).toBe(4);
	});

	test('reports the isValid of the form state it is given, never one recomputed from the errors', () => {
		const input = {
			config: { id: 'contact' },
			values: {},
			step: { id: 'main', position: 0, total: 1 },
			mountedAt: 1_900,
			form,
			fetch,
		};

		const pristine = buildFormActionContext({
			...input,
			formState: { isValid: true, errors: {}, touched: {}, submitCount: 0 },
		});
		const failed = buildFormActionContext({
			...input,
			formState: {
				isValid: false,
				errors: {
					email: {
						type: 'validation',
						source: 'validation',
						message: 'Required',
						all: [{ type: 'validation', source: 'validation', message: 'Required' }],
					},
				},
				touched: {},
				submitCount: 0,
			},
		});

		const nested = buildFormActionContext({
			...input,
			formState: {
				isValid: false,
				errors: {
					'contacts.1.email': {
						type: 'validation',
						source: 'validation',
						message: 'Invalid',
						all: [{ type: 'validation', source: 'validation', message: 'Invalid' }],
					},
				},
				touched: {},
				submitCount: 0,
			},
		});
		const formLevel = buildFormActionContext({
			...input,
			formState: {
				isValid: false,
				errors: {
					'': {
						type: 'server',
						source: 'validation',
						message: 'Try later',
						all: [{ type: 'server', source: 'validation', message: 'Try later' }],
					},
				},
				touched: {},
				submitCount: 0,
			},
		});

		expect(pristine.isValid).toBe(true);
		expect(failed.isValid).toBe(false);
		expect(nested.isValid).toBe(false);
		expect(formLevel.isValid).toBe(false);
		expect(nested.errors['contacts.1.email']).toEqual({
			type: 'validation',
			source: 'validation',
			message: 'Invalid',
			all: [{ type: 'validation', source: 'validation', message: 'Invalid' }],
		});
	});

	test('takes isValid from the form state even when its errors say otherwise', () => {
		const error = {
			type: 'warning-only',
			source: 'validation' as const,
			all: [{ type: 'warning-only', source: 'validation' as const }],
		};
		const context = buildFormActionContext({
			config: { id: 'contact' },
			values: {},
			step: { id: 'main', position: 0, total: 1 },
			mountedAt: 1_900,
			form,
			fetch,
			formState: { isValid: true, errors: { email: error }, touched: {}, submitCount: 0 },
		});

		expect(context.isValid).toBe(true);
	});
});

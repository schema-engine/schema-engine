import { afterEach, describe, expect, test, vi } from 'vitest';
import { buildFormActionContext } from '@/index';

const form = {
	reset: () => undefined,
	setValue: () => undefined,
	getValue: () => undefined,
	validate: async () => true,
	checkValidity: async () => true,
};

describe('buildFormActionContext', () => {
	afterEach(() => {
		vi.useRealTimers();
	});

	test('keeps a step start time stable, then advances it when the active step changes', () => {
		vi.useFakeTimers();
		vi.setSystemTime(1_000);
		const input = {
			config: { id: 'contact', steps: [{}, {}] },
			values: { email: 'person@example.com' },
			formState: { errors: {}, touched: { email: true }, submitCount: 2 },
			currentStep: 0,
			mountedAt: 900,
			form,
		};

		const first = buildFormActionContext(input);
		vi.advanceTimersByTime(50);
		const sameStep = buildFormActionContext(input);
		const nextStep = buildFormActionContext({ ...input, currentStep: 1 });

		expect(first.formData).toEqual(input.values);
		expect(first.metadata).toEqual({ stepStartTime: 900, totalFormTime: 100, userInteractions: 3 });
		expect(sameStep.metadata.stepStartTime).toBe(900);
		expect(nextStep.metadata).toEqual({ stepStartTime: 1_050, totalFormTime: 150, userInteractions: 3 });
	});

	test('counts each touched nested field and array row field as one interaction', () => {
		const context = buildFormActionContext({
			config: { id: 'contact', steps: [{}] },
			values: {},
			formState: {
				errors: {},
				touched: { address: { street: true, city: true, zip: false }, contacts: [{ email: true }, undefined] },
				submitCount: 1,
			},
			currentStep: 0,
			mountedAt: 1_800,
			form,
		});

		expect(context.metadata.userInteractions).toBe(4);
	});

	test('reports isValid from the recorded errors', () => {
		const input = {
			config: { id: 'contact', steps: [{}] },
			values: {},
			currentStep: 0,
			mountedAt: 1_900,
			form,
		};

		const pristine = buildFormActionContext({ ...input, formState: { errors: {}, touched: {}, submitCount: 0 } });
		const failed = buildFormActionContext({
			...input,
			formState: { errors: { email: { message: 'Required' } }, touched: {}, submitCount: 0 },
		});

		const nested = buildFormActionContext({
			...input,
			formState: {
				errors: { contacts: [undefined, { email: { type: 'validation', message: 'Invalid' } }] },
				touched: {},
				submitCount: 0,
			},
		});
		const emptied = buildFormActionContext({
			...input,
			formState: { errors: { address: {}, contacts: [undefined, {}] }, touched: {}, submitCount: 0 },
		});

		expect(pristine.isValid).toBe(true);
		expect(failed.isValid).toBe(false);
		expect(nested.isValid).toBe(false);
		expect(emptied.isValid).toBe(true);
	});
});

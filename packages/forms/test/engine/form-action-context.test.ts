import { afterEach, describe, expect, test, vi } from 'vitest';
import { buildFormActionContext } from '@/index';

const form = {
	reset: () => undefined,
	setValue: () => undefined,
	getValue: () => undefined,
	validate: async () => true,
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
			formState: { isValid: true, errors: {}, touchedFields: { email: true }, submitCount: 2 },
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

	test('reads touched interactions from the Radiant form state shape', () => {
		vi.useFakeTimers();
		vi.setSystemTime(2_000);

		const context = buildFormActionContext({
			config: { id: 'contact', steps: [{}] },
			values: {},
			formState: { isValid: false, errors: {}, touched: { email: true }, isSubmitted: true },
			currentStep: 0,
			mountedAt: 1_800,
			form,
		});

		expect(context.metadata.userInteractions).toBe(2);
	});
});

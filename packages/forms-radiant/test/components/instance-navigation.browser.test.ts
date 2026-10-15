import { afterEach, expect, test, vi } from 'vitest';
import { FormStore } from '@ecopages/radiant-ui/form';
import { FormInstanceElement } from '@/components/form-instance.script';
import { FormStepElement } from '@/components/form-step';
import { provideTestFormStore } from '../adapters/test-form';

afterEach(() => document.body.replaceChildren());

test('Next validates the current step, blocks invalid navigation, and updates wizard visibility', async () => {
	const instance = new FormInstanceElement();
	instance.config = {
		id: 'wizard',
		steps: [
			{ id: 'first', title: 'First', elements: [{ $type: 'input', id: 'email', name: 'email' }] },
			{ id: 'second', title: 'Second', elements: [] },
		],
	};
	const host = document.createElement('rui-form');
	const store = new FormStore();
	const validate = vi.spyOn(store, 'validateField').mockResolvedValue(false);
	provideTestFormStore(host, store);
	const steps = [0, 1].map((stepIndex) => {
		const step = new FormStepElement();
		step.isWizard = true;
		step.stepIndex = stepIndex;
		host.append(step);
		return step;
	});
	instance.append(host);
	document.body.append(instance);
	await expect.poll(() => steps[1]?.hidden).toBe(true);
	await instance.goToNextStep();
	expect(validate).toHaveBeenCalledWith('email');
	expect(instance.currentStep).toBe(0);
	expect(instance.stepStates.valid).toEqual([false, false]);
	validate.mockResolvedValue(true);
	await instance.goToNextStep();
	await expect.poll(() => steps.map((step) => step.hidden)).toEqual([true, false]);
	expect(instance.stepStates.completed).toEqual([true, false]);
	instance.goToPreviousStep();
	await expect.poll(() => steps.map((step) => step.hidden)).toEqual([false, true]);
	expect(instance.currentStep).toBe(0);
});

import { afterEach, expect, test, vi } from 'vitest';
import { FormInstanceElement } from '@/components/form-instance.script';
import { FormStepElement } from '@/components/form-step';
import { FormController } from '@/adapters/radiant/controller';
import { createRadiantFormEngine } from '@/registries/builder-registry';
import { schemaFormRegistrations } from '@/registrations';
import { WizardRecipe } from '@/recipes';

afterEach(() => document.body.replaceChildren());

/** The container the instance made for the `rui-form` in its light DOM, once it exists. */
async function containerOf(host: HTMLElement) {
	await expect.poll(() => new FormController(host).container).toBeTruthy();
	return new FormController(host).container!;
}

test('Next validates the current step, blocks invalid navigation, and updates wizard visibility', async () => {
	const instance = new FormInstanceElement();
	instance.engine = createRadiantFormEngine({ elements: schemaFormRegistrations, recipes: [WizardRecipe] });
	instance.config = instance.engine.validateForm({
		id: 'wizard',
		view: { $type: 'wizard' },
		steps: [
			{ id: 'first', title: 'First', elements: [{ $type: 'input', id: 'email', name: 'email' }] },
			{ id: 'second', title: 'Second', elements: [] },
		],
	});
	const host = document.createElement('rui-form');
	const steps = [0, 1].map((stepIndex) => {
		const step = new FormStepElement();
		step.stepIndex = stepIndex;
		host.append(step);
		return step;
	});
	instance.append(host);
	document.body.append(instance);
	const validate = vi.spyOn(await containerOf(host), 'validate').mockResolvedValue(false);
	const sync = vi.spyOn(host, 'sync');
	await expect.poll(() => steps[1]?.hidden).toBe(true);
	await instance.goToNextStep();
	expect(sync).toHaveBeenCalledTimes(1);
	expect(validate).toHaveBeenCalledWith(['email']);
	expect(sync.mock.invocationCallOrder[0]).toBeLessThan(validate.mock.invocationCallOrder[0]!);
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

test('a step whose index changes is judged against the current step, not step 0', async () => {
	const instance = new FormInstanceElement();
	instance.engine = createRadiantFormEngine({ elements: schemaFormRegistrations, recipes: [WizardRecipe] });
	instance.config = instance.engine.validateForm({
		id: 'wizard',
		view: { $type: 'wizard' },
		steps: [
			{ id: 'first', title: 'First', elements: [{ $type: 'input', id: 'email', name: 'email' }] },
			{ id: 'second', title: 'Second', elements: [] },
		],
	});
	const host = document.createElement('rui-form');
	const steps = [0, 1].map((stepIndex) => {
		const step = new FormStepElement();
		step.stepIndex = stepIndex;
		host.append(step);
		return step;
	});
	instance.append(host);
	document.body.append(instance);
	vi.spyOn(await containerOf(host), 'validate').mockResolvedValue(true);
	await expect.poll(() => steps[1]?.hidden).toBe(true);
	await instance.goToNextStep();
	await expect.poll(() => steps.map((step) => step.hidden)).toEqual([true, false]);

	steps[0].stepIndex = 1;
	steps[1].stepIndex = 0;

	await expect.poll(() => steps.map((step) => step.hidden)).toEqual([false, true]);
});

test('a hidden step unhides when the config changes from a wizard to a non-wizard view', async () => {
	const instance = new FormInstanceElement();
	const engine = createRadiantFormEngine({ elements: schemaFormRegistrations, recipes: [WizardRecipe] });
	instance.engine = engine;
	instance.config = engine.validateForm({
		id: 'wizard',
		view: { $type: 'wizard' },
		steps: [
			{ id: 'first', title: 'First', elements: [] },
			{ id: 'second', title: 'Second', elements: [] },
		],
	});
	const host = document.createElement('rui-form');
	const step = new FormStepElement();
	host.append(step);
	instance.append(host);
	document.body.append(instance);
	await expect.poll(() => step.hidden).toBe(false);
	await instance.goToNextStep();
	await expect.poll(() => step.hidden).toBe(true);

	instance.config = engine.validateForm({
		id: 'plain',
		view: { $type: 'card' },
		steps: [{ id: 'only', title: 'Only', elements: [] }],
	});

	await expect.poll(() => step.hidden).toBe(false);
});

test('Next on the last step validates it and marks it valid', async () => {
	const instance = new FormInstanceElement();
	instance.engine = createRadiantFormEngine({ elements: schemaFormRegistrations });
	instance.config = instance.engine.validateForm({
		id: 'wizard',
		steps: [{ id: 'only', title: 'Only', elements: [{ $type: 'input', id: 'email', name: 'email' }] }],
	});
	const host = document.createElement('rui-form');
	instance.append(host);
	document.body.append(instance);
	const validate = vi.spyOn(await containerOf(host), 'validate').mockResolvedValue(true);

	await instance.goToNextStep();

	expect(validate).toHaveBeenCalledWith(['email']);
	expect(instance.currentStep).toBe(0);
	expect(instance.stepStates.valid).toEqual([true]);
});

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

const wizardConfig = (email: Record<string, unknown> = {}) => ({
	id: 'wizard',
	view: { $type: 'wizard' },
	steps: [
		{ id: 'first', title: 'First', elements: [{ $type: 'input', id: 'email', name: 'email', ...email }] },
		{ id: 'second', title: 'Second', elements: [] },
	],
});

/** An instance over a wizard with one `se-form-step` per step, and the steps it hosts. */
function mountWizard(email: Record<string, unknown> = {}) {
	const instance = new FormInstanceElement();
	instance.engine = createRadiantFormEngine({ elements: schemaFormRegistrations, recipes: [WizardRecipe] });
	instance.config = instance.engine.validateForm(wizardConfig(email));
	const host = document.createElement('rui-form');
	const steps = ['first', 'second'].map((stepId) => {
		const step = new FormStepElement();
		step.stepId = stepId;
		host.append(step);
		return step;
	});
	instance.append(host);
	document.body.append(instance);
	return { instance, host, steps };
}

const current = (instance: FormInstanceElement) => instance.getContextValue().current;

test('Next syncs and validates the current step, stays when it is overtaken, and updates wizard visibility', async () => {
	const { instance, host, steps } = mountWizard();
	const validate = vi.spyOn(await containerOf(host), 'validate').mockResolvedValue({ outcome: 'overtaken' });
	const sync = vi.spyOn(host, 'sync');
	await expect.poll(() => steps[1]?.hidden).toBe(true);
	expect(await instance.next()).toBe('overtaken');
	expect(sync).toHaveBeenCalledTimes(1);
	expect(validate).toHaveBeenCalledWith(['email']);
	expect(sync.mock.invocationCallOrder[0]).toBeLessThan(validate.mock.invocationCallOrder[0]!);
	expect(current(instance)).toBe('first');
	validate.mockResolvedValue({ outcome: 'passed' });
	expect(await instance.next()).toBe('moved');
	await expect.poll(() => steps.map((step) => step.hidden)).toEqual([true, false]);
	expect(instance.getContextValue().steps.map(({ complete }) => complete)).toEqual([true, false]);
	expect(await instance.back()).toBe('moved');
	await expect.poll(() => steps.map((step) => step.hidden)).toEqual([false, true]);
	expect(current(instance)).toBe('first');
});

test('a step is judged against the current step by its id, not its position', async () => {
	const { instance, host, steps } = mountWizard();
	vi.spyOn(await containerOf(host), 'validate').mockResolvedValue({ outcome: 'passed' });
	await expect.poll(() => steps[1]?.hidden).toBe(true);
	await instance.next();
	await expect.poll(() => steps.map((step) => step.hidden)).toEqual([true, false]);

	steps[0].stepId = 'second';
	steps[1].stepId = 'first';

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
	step.stepId = 'first';
	host.append(step);
	instance.append(host);
	document.body.append(instance);
	await expect.poll(() => step.hidden).toBe(false);
	await instance.next();
	await expect.poll(() => step.hidden).toBe(true);

	instance.config = engine.validateForm({
		id: 'plain',
		view: { $type: 'card' },
		steps: [{ id: 'only', title: 'Only', elements: [] }],
	});

	await expect.poll(() => step.hidden).toBe(false);
});

test('Next on the last step is refused and validates nothing', async () => {
	const instance = new FormInstanceElement();
	instance.engine = createRadiantFormEngine({ elements: schemaFormRegistrations });
	instance.config = instance.engine.validateForm({
		id: 'wizard',
		steps: [{ id: 'only', title: 'Only', elements: [{ $type: 'input', id: 'email', name: 'email' }] }],
	});
	const host = document.createElement('rui-form');
	instance.append(host);
	document.body.append(instance);
	const validate = vi.spyOn(await containerOf(host), 'validate').mockResolvedValue({ outcome: 'passed' });

	expect(await instance.next()).toBe('refused');

	expect(validate).not.toHaveBeenCalled();
	expect(current(instance)).toBe('only');
});

test('a direct container.reset() returns the wizard to its first step', async () => {
	const { instance, host } = mountWizard();
	const container = await containerOf(host);
	vi.spyOn(container, 'validate').mockResolvedValue({ outcome: 'passed' });
	await instance.next();
	expect(current(instance)).toBe('second');

	container.reset();

	await expect.poll(() => current(instance)).toBe('first');
	expect(instance.getContextValue().steps.map(({ visited, complete }) => [visited, complete])).toEqual([
		[true, false],
		[false, false],
	]);
});

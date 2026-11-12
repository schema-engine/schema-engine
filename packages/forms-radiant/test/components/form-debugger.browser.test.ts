import { afterEach, expect, test } from 'vitest';
import { createRoot } from '@ecopages/jsx/client';
import { FormRenderer } from '@/components/internals/form-renderer';
import { FormDebugger } from '@/components/form-debugger';
import { createRadiantFormEngine } from '@/registries/builder-registry';
import { schemaFormRegistrations } from '@/registrations';
import { CardRecipe, WizardRecipe } from '@/recipes';

afterEach(() => document.body.replaceChildren());

const engine = createRadiantFormEngine({
	elements: schemaFormRegistrations,
	recipes: [CardRecipe, WizardRecipe],
});

test('the debugger follows the current step and reads the form title from the instance context', async () => {
	const host = document.createElement('div');
	document.body.append(host);
	const config = engine.validateForm({
		id: 'debugged',
		title: 'Debugged form',
		view: { $type: 'wizard' },
		steps: [
			{ id: 'one', title: 'One', elements: [] },
			{ id: 'two', title: 'Two', elements: [] },
		],
	});
	createRoot(host).render(FormRenderer({ config, engine, children: FormDebugger({ defaultOpen: true }) }));
	await expect.poll(() => host.querySelector('.se-form-debugger__title')?.textContent).toBe('Debugged form');
	await expect.poll(() => host.querySelector('.se-form-debugger__subtitle')?.textContent).toContain('Step 1 / 2');

	host.querySelector<HTMLButtonElement>('.se-form-debugger__nav > button:last-child')!.click();

	await expect.poll(() => host.querySelector('.se-form-debugger__subtitle')?.textContent).toContain('Step 2 / 2');
});

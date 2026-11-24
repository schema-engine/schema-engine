import { afterEach, expect, test } from 'vitest';
import { createRoot } from '@ecopages/jsx/client';
import { FormController } from '@/adapters/radiant/controller';
import type { FormInstanceElement } from '@/components/form-instance.script';
import { FormRenderer } from '@/components/internals/form-renderer';
import { createRadiantFormEngine } from '@/registries/builder-registry';
import { schemaFormRegistrations } from '@/registrations';

afterEach(() => document.body.replaceChildren());

const engine = createRadiantFormEngine({ elements: schemaFormRegistrations });

const config = engine.validateForm({
	id: 'survey',
	view: { $type: 'wizard' },
	steps: [
		{ id: 'experience', title: 'Experience', elements: [{ $type: 'input', id: 'rating', name: 'rating' }] },
		{
			id: 'problem',
			title: 'Problem',
			constraints: [{ field: 'rating', operator: 'equals', value: 'poor', $type: 'show' }],
			elements: [{ $type: 'input', id: 'reason', name: 'reason' }],
		},
		{ id: 'thanks', title: 'Thanks', elements: [] },
	],
});

test('a step that starts skipped shows its fields once a value activates it and the wizard moves to it', async () => {
	const host = document.createElement('div');
	document.body.append(host);
	createRoot(host).render(FormRenderer({ config, engine }));
	const ruiForm = host.querySelector('rui-form')!;
	await expect.poll(() => new FormController(ruiForm).container).toBeTruthy();
	const instance = host.querySelector<FormInstanceElement>('se-form-instance')!;
	const problem = host.querySelector<HTMLElement>('se-form-step[data-se-step="problem"]')!;
	const reason = () => host.querySelector<HTMLElement>('input[name="reason"]')!;
	expect(problem.hidden).toBe(true);

	new FormController(ruiForm).container!.setValue('rating', 'poor');
	await expect
		.poll(() => instance.getContextValue().steps.map(({ skipped }) => skipped))
		.toEqual([false, false, false]);
	expect(problem.hidden).toBe(true);
	expect(await instance.next()).toBe('moved');

	await expect.poll(() => problem.hidden).toBe(false);
	expect(reason().checkVisibility()).toBe(true);
});

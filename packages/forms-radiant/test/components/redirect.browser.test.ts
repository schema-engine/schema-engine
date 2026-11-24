import { afterEach, expect, test, vi } from 'vitest';
import { createRoot } from '@ecopages/jsx/client';
import { FormController } from '@/adapters/radiant/controller';
import { FormRenderer } from '@/components/internals/form-renderer';
import { createRadiantFormEngine } from '@/registries/builder-registry';
import { schemaFormRegistrations } from '@/registrations';
import { testAction } from '../adapters/test-actions';

afterEach(() => document.body.replaceChildren());

const engine = createRadiantFormEngine({
	elements: schemaFormRegistrations,
	actions: [testAction('go', ['form_submit'], async () => ({ success: true, redirectUrl: '/thanks' }))],
});

async function mountForm(props: Partial<Parameters<typeof FormRenderer>[0]>) {
	const host = document.createElement('div');
	document.body.append(host);
	const config = engine.validateForm({
		id: 'redirect',
		steps: [{ id: 'main', title: 'Main', elements: [] }],
		actions: [{ id: 'go', $type: 'go' }],
	});
	createRoot(host).render(FormRenderer({ ...props, config, engine }));
	const ruiForm = host.querySelector('rui-form')!;
	await expect.poll(() => new FormController(ruiForm).container).toBeTruthy();
	return host;
}

test('onActionResults receives the results of the submit actions, as the se-action-results event does', async () => {
	const onActionResults = vi.fn();
	const host = await mountForm({ onActionResults, navigate: () => undefined, onSubmit: () => undefined });
	const announced = vi.fn();
	host.querySelector('rui-form')!.addEventListener('se-action-results', announced);

	host.querySelector('form')!.requestSubmit();

	await expect.poll(() => onActionResults.mock.calls.length).toBeGreaterThan(0);
	const [results, trigger] = onActionResults.mock.calls[0];
	expect(trigger).toBe('form_submit');
	expect(results).toMatchObject([{ actionId: 'go', success: true }]);
	expect(announced.mock.calls[0][0].detail).toEqual({ trigger, results });
});

test('navigate receives the redirectUrl once the submission succeeded', async () => {
	const navigate = vi.fn();
	const host = await mountForm({ navigate, onSubmit: () => undefined });

	host.querySelector('form')!.requestSubmit();

	await expect.poll(() => navigate.mock.calls.length).toBe(1);
	expect(navigate).toHaveBeenCalledWith('/thanks');
});

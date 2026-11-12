import { expect, test, vi } from 'vitest';
import { createRoot } from '@ecopages/jsx/client';
import { FormController } from '@/adapters/radiant/controller';
import { FormRenderer } from '@/components/internals/form-renderer';
import { createRadiantFormEngine } from '@/registries/builder-registry';
import { schemaFormRegistrations } from '@/registrations';
import { evaluateConstraints } from '@schema-engine/forms/constraints';

vi.mock('@schema-engine/forms/constraints', async (importOriginal) => {
	const actual = await importOriginal<typeof import('@schema-engine/forms/constraints')>();
	return { ...actual, evaluateConstraints: vi.fn(actual.evaluateConstraints) };
});

const engine = createRadiantFormEngine({ elements: schemaFormRegistrations });

test('a constraint host re-evaluates only when a value its constraints read changes', async () => {
	const host = document.createElement('div');
	document.body.append(host);
	const root = createRoot(host);
	const config = engine.validateForm({
		id: 'evaluation',
		steps: [
			{
				id: 'main',
				title: 'Main',
				elements: [
					{ $type: 'input', id: 'mode', name: 'mode' },
					{ $type: 'input', id: 'note', name: 'note' },
					{
						$type: 'input',
						id: 'code',
						name: 'code',
						constraints: [{ field: 'mode', operator: 'equals', value: 'show', action: 'show' }],
					},
				],
			},
		],
	});
	root.render(FormRenderer({ config, engine }));
	const form = new FormController(host.querySelector('rui-form')!);
	try {
		await expect.poll(() => form.ready).toBe(true);
		const wrapper = host.querySelector<HTMLElement>('se-constraint')!;
		await new Promise((resolve) => setTimeout(resolve, 50));
		vi.mocked(evaluateConstraints).mockClear();

		form.setValue('note', 'unrelated');
		form.setValue('note', 'still unrelated');
		await new Promise((resolve) => setTimeout(resolve, 50));
		expect(evaluateConstraints).not.toHaveBeenCalled();
		expect(wrapper.hidden).toBe(true);

		form.setValue('mode', 'show');
		await expect.poll(() => wrapper.hidden).toBe(false);
		expect(evaluateConstraints).toHaveBeenCalledTimes(1);
	} finally {
		form.disconnect();
		root.unmount();
		host.remove();
	}
});

import { afterEach, expect, test } from 'vitest';
import { createRoot } from '@ecopages/jsx/client';
import { FormRenderer } from '@/components/internals/form-renderer';
import { createRadiantFormEngine } from '@/registries/builder-registry';
import { schemaFormRegistrations } from '@/registrations';
import '@/styles/hosts.css';
import '@/elements/inputs/form-fieldset.css';

afterEach(() => document.body.replaceChildren());

const engine = createRadiantFormEngine({ elements: schemaFormRegistrations });

test('a fieldset lays itself out as a grid without turning its fields into grids', async () => {
	const host = document.createElement('div');
	document.body.append(host);
	const config = {
		id: 'nested-display',
		steps: [
			{
				id: 'main',
				title: 'Main',
				elements: [
					{
						$type: 'fieldSet',
						id: 'address',
						name: 'address',
						legend: 'Address',
						elements: [{ $type: 'input', id: 'street', name: 'street', label: 'Street' }],
					},
				],
			},
		],
	};
	createRoot(host).render(FormRenderer({ config: engine.validateForm(config), engine }));
	await expect.poll(() => host.querySelector('.se-fieldset se-field')).toBeTruthy();

	expect(getComputedStyle(host.querySelector('.se-fieldset')!).display).toBe('grid');
	expect(getComputedStyle(host.querySelector('.se-fieldset se-field')!).display).toBe('block');
});

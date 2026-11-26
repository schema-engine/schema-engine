import { afterEach, expect, test } from 'vitest';
import { createRoot } from '@ecopages/jsx/client';
import type { LayoutInput } from '@schema-engine/layout';
import { FormRenderer } from '@/components/internals/form-renderer';
import { createRadiantFormEngine } from '@/registries/builder-registry';
import { schemaFormRegistrations } from '@/registrations';
import '@/styles/hosts.css';
import '@/elements/inputs/form-fieldset.css';
import '@/elements/inputs/form-array-elements.css';

afterEach(() => document.body.replaceChildren());

const input = (id: string) => ({ $type: 'input', id, name: id, label: id });

/** A form with no responsive value, so both query modes resolve every grid to the same layout. */
const form = {
	id: 'query-parity',
	steps: [
		{
			id: 'main',
			title: 'Main',
			elements: [
				input('first'),
				{ $type: 'fieldSet', id: 'group', name: 'group', legend: 'Group', elements: [input('street')] },
				{
					$type: 'arrayElements',
					id: 'rows',
					name: 'rows',
					label: 'Rows',
					minItems: 1,
					elements: [input('item')],
				},
			],
		},
	],
};

/** Boxes of every grid and grid item, relative to the host, once the array row has rendered. */
async function boxes(layout?: LayoutInput): Promise<string[]> {
	const host = document.createElement('div');
	host.style.width = '600px';
	document.body.append(host);
	const engine = createRadiantFormEngine({ elements: schemaFormRegistrations, layout });
	createRoot(host).render(FormRenderer({ config: engine.validateForm(form), engine, defaultValues: { rows: [{}] } }));
	await expect.poll(() => host.querySelector('.se-form-array__fields .se-grid-item')).toBeTruthy();
	const origin = host.getBoundingClientRect();
	const measured = Array.from(host.querySelectorAll<HTMLElement>('.se-grid, .se-grid-item'), (element) => {
		const box = element.getBoundingClientRect();
		return `${element.className}: ${box.left - origin.left},${box.top - origin.top} ${box.width}x${box.height}`;
	});
	host.remove();
	return measured;
}

test('a container theme lays a form out as the media theme does when no breakpoint applies', async () => {
	const media = await boxes();
	const container = await boxes({ grid: { query: 'container' } });
	expect(media.length).toBeGreaterThanOrEqual(7);
	expect(container).toEqual(media);
});

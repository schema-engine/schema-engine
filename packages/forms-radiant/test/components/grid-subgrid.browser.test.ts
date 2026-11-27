import { findSubgridChainBreaks } from '@schema-engine/layout/testing';
import { afterEach, describe, expect, test } from 'vitest';
import { createRoot } from '@ecopages/jsx/client';
import { FormRenderer } from '@/components/internals/form-renderer';
import { createRadiantFormEngine } from '@/registries/builder-registry';
import { schemaFormRegistrations } from '@/registrations';
import { accessibleGroups } from '../../../../test-utils/accessibility-tree';
import { aligned, boxOf, expectSubgridOf, fieldHost, trackInset } from '../../../../test-utils/ssr-grid-acceptance';
import '@/styles/hosts.css';
import '@/elements/inputs/form-fieldset.css';

afterEach(() => document.body.replaceChildren());

const input = (label: string, grid?: Record<string, unknown>) => ({
	$type: 'input',
	inputType: 'text',
	id: label.toLowerCase(),
	name: label.toLowerCase(),
	label,
	...(grid ? { grid } : {}),
});

/** A step of two halves and a subgrid fieldset of two halves, with the fieldset's own stylesheet loaded. */
const form = (fieldset: Record<string, unknown> = {}) => ({
	id: 'subgrid-client',
	steps: [
		{
			id: 'main',
			title: 'Main',
			elements: [
				input('First', { width: 'half' }),
				input('Last', { width: 'half' }),
				{
					$type: 'fieldSet',
					id: 'address',
					name: 'address',
					legend: 'Address',
					grid: { subgrid: true },
					elements: [input('Street', { width: 'half' }), input('City', { width: 'half' })],
					...fieldset,
				},
			],
		},
	],
});

async function mount(config: object): Promise<HTMLElement> {
	const host = document.createElement('div');
	host.style.width = '900px';
	document.body.append(host);
	const engine = createRadiantFormEngine({ elements: schemaFormRegistrations });
	createRoot(host).render(FormRenderer({ config: engine.validateForm(config), engine }));
	await expect.poll(() => host.querySelector('.se-fieldset .se-grid-item')).toBeTruthy();
	return host;
}

describe('a subgrid fieldset in a client-rendered Radiant form', () => {
	test('lines up with the step, inset by the fieldset padding and border of its stylesheet', async () => {
		await mount(form());
		expectSubgridOf(document, /Street/, 12);
		const first = boxOf(document, /First/);
		const last = boxOf(document, /Last/);
		const street = boxOf(document, /Street/);
		const city = boxOf(document, /City/);
		const inset = trackInset(fieldHost(document, /Street/), 'Left');
		expect(inset, 'the fieldset keeps its border and padding').toBeGreaterThan(0);
		aligned(street.left, first.left + inset);
		aligned(street.right, first.right);
		aligned(city.left, last.left);
		aligned(city.right, last.right - trackInset(fieldHost(document, /City/), 'Right'));
		aligned(street.top, city.top);
	});

	test('has a subgrid class on every box between the fieldset and the step grid', async () => {
		const host = await mount(form());
		expect(host.querySelectorAll('.se-subgrid').length).toBeGreaterThan(0);
		expect(findSubgridChainBreaks(host)).toEqual([]);
	});

	test('keeps its alignment when a constraint wraps the fieldset in a host', async () => {
		const host = await mount(
			form({ constraints: [{ field: 'first', operator: 'equals', value: 'never', $type: 'hide' }] }),
		);
		await expect.poll(() => document.querySelector('se-constraint')).toBeTruthy();
		expect(findSubgridChainBreaks(host)).toEqual([]);
		expectSubgridOf(document, /Street/, 12);
		const first = boxOf(document, /First/);
		const street = boxOf(document, /Street/);
		aligned(street.left, first.left + trackInset(fieldHost(document, /Street/), 'Left'));
		aligned(street.right, first.right);
	});

	test('is a group named by its legend in the browser accessibility tree, holding its fields', async () => {
		await mount(form());
		expect(await accessibleGroups()).toContainEqual({ name: 'Address', textboxes: ['Street', 'City'] });
	});

	test('is named by its legend when its name has a space and it has no id', async () => {
		await mount(form({ id: undefined, name: 'Mailing address' }));
		expect(await accessibleGroups()).toContainEqual({ name: 'Address', textboxes: ['Street', 'City'] });
	});
});

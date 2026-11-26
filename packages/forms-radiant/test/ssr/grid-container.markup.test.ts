import { renderToString } from '@ecopages/jsx/server';
import {
	withRadiantServerCustomElementRenderBridge,
	withServerRadiantElementSsrRuntime,
} from '@ecopages/radiant/server/radiant-element-ssr';
import { describe, expect, test } from 'vitest';
import { FormRenderer } from '@/components/internals/form-renderer';
import { createRadiantFormEngine } from '@/registries/builder-registry';
import { schemaFormRegistrations } from '@/registrations';
import { expectGridContainers, expectNoGridContainers } from '../../../../test-utils/ssr-grid-acceptance';
import { SSR_CONTAINER_LAYOUT, ssrNestedFields } from '../../../../test-utils/ssr-grid-fixtures';

const children = ssrNestedFields('Nest').map(({ id, label, grid }) => ({
	$type: 'input',
	inputType: 'text',
	id,
	name: id,
	label,
	grid,
}));

const form = {
	id: 'ssr-nested-grids',
	title: 'SSR nested grids',
	steps: [
		{
			id: 'main',
			title: 'Main',
			elements: [
				{ $type: 'fieldSet', id: 'group', name: 'group', legend: 'Group', elements: children },
				{ $type: 'arrayElements', id: 'rows', name: 'rows', label: 'Rows', minItems: 1, elements: children },
			],
		},
	],
};

/** Server markup of a step grid, a fieldset and an array row: three grids, two nested in the first. */
function render(layout?: typeof SSR_CONTAINER_LAYOUT) {
	const engine = createRadiantFormEngine({ elements: schemaFormRegistrations, layout });
	const html = withServerRadiantElementSsrRuntime(() =>
		withRadiantServerCustomElementRenderBridge(() =>
			renderToString(FormRenderer({ config: engine.validateForm(form), engine, defaultValues: { rows: [{}] } }), {
				mode: 'hydrate',
			}),
		),
	);
	return { html, layout: engine.getLayout() };
}

describe('the query container in Radiant markup', () => {
	test('a theme that queries the viewport renders no wrapper and no container rule', () => {
		const { html, layout } = render();
		expectNoGridContainers(html, layout);
		expect(html).toMatch(/class="se-form-elements se-form-grid se-grid"/);
	});

	test('a theme that queries the container wraps each grid, nested grids included', () => {
		const { html, layout } = render(SSR_CONTAINER_LAYOUT);
		expectGridContainers(html, layout, 3);
		expect(html).toContain('container-type:inline-size');
	});

	test('a nested grid sits in its own wrapper, inside the grid of the step', () => {
		const { html } = render(SSR_CONTAINER_LAYOUT);
		const wrappers = Array.from(html.matchAll(/class="se-grid-container"/g), (match) => match.index);
		const stepGrid = html.search(/class="se-form-elements se-form-grid se-grid"/);
		expect(wrappers).toHaveLength(3);
		expect(wrappers[0]).toBeLessThan(stepGrid);
		expect(stepGrid).toBeLessThan(wrappers[1] ?? 0);
		expect(wrappers[1]).toBeLessThan(wrappers[2] ?? 0);
	});
});

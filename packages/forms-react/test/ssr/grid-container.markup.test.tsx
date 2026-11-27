import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, test } from 'vitest';
import { FormEngineProvider } from '@/components/form-engine-provider';
import { ChildGrid } from '@/primitives';

import { SSR_CONTAINER_LAYOUT } from '../../../../test-utils/ssr-grid-fixtures';
import { expectGridContainers, expectNoGridContainers } from '../../../../test-utils/ssr-grid-acceptance';
import { renderSsrNestedGridsHtml } from './render-form-ssr-html';
import { createSsrAcceptanceEngine } from './ssr-fixture';

describe('the query container in React markup', () => {
	test('a theme that queries the viewport renders no wrapper and no container rule', () => {
		const { html, layout } = renderSsrNestedGridsHtml();
		expectNoGridContainers(html, layout);
		expect(html).toMatch(/class="se-form-grid se-grid"/);
	});

	test('a theme that queries the container wraps each grid, nested grids included', () => {
		const { html, layout } = renderSsrNestedGridsHtml(SSR_CONTAINER_LAYOUT);
		expectGridContainers(html, layout, 3);
		expect(html).toContain('container-type:inline-size');
	});

	test('a nested grid sits in its own wrapper, inside the grid of the step', () => {
		const { html } = renderSsrNestedGridsHtml(SSR_CONTAINER_LAYOUT);
		const wrappers = Array.from(html.matchAll(/class="se-grid-container"/g), (match) => match.index);
		const grids = Array.from(html.matchAll(/class="se-form-grid se-grid"/g), (match) => match.index);
		expect(wrappers).toHaveLength(3);
		expect(grids).toHaveLength(3);
		expect(wrappers[0]).toBeLessThan(grids[0] ?? 0);
		expect(grids[0]).toBeLessThan(wrappers[1] ?? 0);
		expect(wrappers[1]).toBeLessThan(wrappers[2] ?? 0);
	});

	test('ChildGrid renders the grid of a custom element, in its wrapper only under a container theme', () => {
		const render = (layout?: typeof SSR_CONTAINER_LAYOUT) => {
			const engine = createSsrAcceptanceEngine(layout);
			const html = renderToStaticMarkup(
				<FormEngineProvider engine={engine}>
					<ChildGrid elements={[{ grid: { width: 'half' } }]} className="rows">
						<span>child</span>
					</ChildGrid>
				</FormEngineProvider>,
			);
			return { html, id: engine.getLayout().id };
		};
		const media = render();
		expect(media.html).toMatch(
			new RegExp(
				`^<div class="se-form-grid se-grid rows" data-se-theme="${media.id}" style="--se-grid-template:repeat\\(12`,
			),
		);
		const container = render(SSR_CONTAINER_LAYOUT);
		expect(container.html).toMatch(
			new RegExp(
				`^<div class="se-grid-container" data-se-theme="${container.id}"><div class="se-form-grid se-grid rows" data-se-theme="${container.id}"`,
			),
		);
		expect(container.html).toContain('<span>child</span></div></div>');
	});

	test('ChildGrid with subgrid carries the subgrid class, no track variables, and no wrapper in any theme', () => {
		const render = (layout?: typeof SSR_CONTAINER_LAYOUT) => {
			const engine = createSsrAcceptanceEngine(layout);
			const html = renderToStaticMarkup(
				<FormEngineProvider engine={engine}>
					<ChildGrid className="rows" subgrid>
						<span>child</span>
					</ChildGrid>
				</FormEngineProvider>,
			);
			return { html, id: engine.getLayout().id };
		};
		for (const layout of [undefined, SSR_CONTAINER_LAYOUT]) {
			const { html, id } = render(layout);
			const grid = `<div class="se-form-grid se-grid se-subgrid rows" data-se-theme="${id}">`;
			expect(html).toBe(`${grid}<span>child</span></div>`);
		}
	});

	test('ChildGrid takes elements or subgrid, and passing both is a type error', () => {
		// @ts-expect-error -- a subgrid has no tracks of its own, so it takes no elements
		const both = <ChildGrid elements={[]} subgrid />;
		expect(both.props).toMatchObject({ subgrid: true });
	});

	test('ChildGrid takes twelve tracks from widths that only a subgrid child sets', () => {
		const engine = createSsrAcceptanceEngine();
		const html = renderToStaticMarkup(
			<FormEngineProvider engine={engine}>
				<ChildGrid elements={[{ grid: { subgrid: true }, elements: [{ grid: { width: 'half' } }] }]} />
				<ChildGrid elements={[{ elements: [{ grid: { width: 'half' } }] }]} />
			</FormEngineProvider>,
		);
		const grids = html.match(/<div class="se-form-grid se-grid"[^>]*>/g) ?? [];
		expect(grids).toHaveLength(2);
		expect(grids[0]).toContain('--se-grid-template:repeat(12');
		expect(grids[1]).not.toContain('style=');
	});
});

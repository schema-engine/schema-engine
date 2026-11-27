import { renderToStaticMarkup } from 'react-dom/server';
import { FormEngineProvider } from '@/components/form-engine-provider';
import { FormRenderer } from '@/components/internals/form-renderer';
import {
	nestedGuestLayout,
	nestedHostTheme,
	nestedThemeForm,
	type NestedThemeFormOptions,
} from '../../../../test-utils/nested-theme-fixtures';
import type { LayoutThemeLike } from '../../../../test-utils/ssr-grid-acceptance';
import {
	SSR_CONTAINER_LAYOUT,
	ssrContainerForm,
	ssrNestedContainerForm,
	ssrNestedFields,
	ssrSubgridForm,
	ssrSubgridLayout,
	type SsrNestedContainerVariant,
	type SsrSubgridVariant,
} from '../../../../test-utils/ssr-grid-fixtures';
import {
	createSsrAcceptanceEngine,
	getSsrAcceptanceFixture,
	getSsrAreasFixture,
	getSsrNestedWidthsFixture,
	getSsrSteppedFixture,
	getSsrWidthsFixture,
} from './ssr-fixture';

/**
 * Markup-only document from the renderer’s server output (no injected theme CSS).
 */
export function renderSsrLayoutAcceptanceHtml(): string {
	const { engine, config } = getSsrAcceptanceFixture();
	const body = renderToStaticMarkup(
		<FormEngineProvider engine={engine}>
			<FormRenderer engine={engine} config={config} />
		</FormEngineProvider>,
	);

	return `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body>${body}</body></html>`;
}

/** Markup-only document for the named width fixture. */
export function renderSsrWidthsAcceptanceHtml(): string {
	const { engine, config } = getSsrWidthsFixture();
	const body = renderToStaticMarkup(
		<FormEngineProvider engine={engine}>
			<FormRenderer engine={engine} config={config} />
		</FormEngineProvider>,
	);

	return `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body>${body}</body></html>`;
}

/** Markup-only document for the nested width fixture: a fieldset and one array row. */
export function renderSsrNestedWidthsAcceptanceHtml(): string {
	const { engine, config } = getSsrNestedWidthsFixture();
	const body = renderToStaticMarkup(
		<FormEngineProvider engine={engine}>
			<FormRenderer engine={engine} config={config} defaultValues={{ rows: [{}] }} />
		</FormEngineProvider>,
	);

	return `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body>${body}</body></html>`;
}

/** Markup-only document for the drawn layout fixture. */
export function renderSsrAreasAcceptanceHtml(): string {
	const { engine, config } = getSsrAreasFixture();
	const body = renderToStaticMarkup(
		<FormEngineProvider engine={engine}>
			<FormRenderer engine={engine} config={config} />
		</FormEngineProvider>,
	);

	return `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body>${body}</body></html>`;
}

/** Markup-only document for the stepped fixture: one step with its own template and one without. */
export function renderSsrSteppedAcceptanceHtml(): string {
	const { engine, config } = getSsrSteppedFixture();
	const body = renderToStaticMarkup(
		<FormEngineProvider engine={engine}>
			<FormRenderer engine={engine} config={config} />
		</FormEngineProvider>,
	);

	return `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body>${body}</body></html>`;
}

/** Markup-only document of the form that measures its grid's container, and the theme it renders under. */
export function renderSsrContainerAcceptanceHtml(): { html: string; layout: LayoutThemeLike } {
	const engine = createSsrAcceptanceEngine(SSR_CONTAINER_LAYOUT);
	const body = renderToStaticMarkup(
		<FormEngineProvider engine={engine}>
			<FormRenderer engine={engine} config={engine.validateForm(ssrContainerForm('ssr-input'))} />
		</FormEngineProvider>,
	);

	return {
		html: `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body>${body}</body></html>`,
		layout: engine.getLayout(),
	};
}

/** Markup-only document of a fieldset that is narrow inside a wide step grid, under the container theme. */
export function renderSsrNestedContainerHtml(variant: SsrNestedContainerVariant): {
	html: string;
	layout: LayoutThemeLike;
} {
	const engine = createSsrAcceptanceEngine(SSR_CONTAINER_LAYOUT);
	const body = renderToStaticMarkup(
		<FormEngineProvider engine={engine}>
			<FormRenderer engine={engine} config={engine.validateForm(ssrNestedContainerForm('ssr-input', variant))} />
		</FormEngineProvider>,
	);
	return {
		html: `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body>${body}</body></html>`,
		layout: engine.getLayout(),
	};
}

/**
 * Markup of a form with a step grid, a fieldset and an array row, so three grids, two of them nested in the first.
 *
 * @param layout The layout input of the engine, which decides whether the grids are wrapped.
 */
export function renderSsrNestedGridsHtml(layout?: Parameters<typeof createSsrAcceptanceEngine>[0]): {
	html: string;
	layout: LayoutThemeLike;
} {
	const engine = createSsrAcceptanceEngine(layout);
	const children = ssrNestedFields('Nest').map(({ id, label, grid }) => ({
		$type: 'ssr-input',
		id,
		name: id,
		label,
		grid,
	}));
	const config = engine.validateForm({
		id: 'ssr-nested-grids',
		title: 'SSR nested grids',
		steps: [
			{
				id: 'main',
				title: 'Main',
				elements: [
					{ $type: 'fieldSet', id: 'group', name: 'group', legend: 'Group', elements: children },
					{
						$type: 'arrayElements',
						id: 'rows',
						name: 'rows',
						label: 'Rows',
						minItems: 1,
						elements: children,
					},
				],
			},
		],
	});
	const html = renderToStaticMarkup(
		<FormEngineProvider engine={engine}>
			<FormRenderer engine={engine} config={config} defaultValues={{ rows: [{}] }} />
		</FormEngineProvider>,
	);
	return { html, layout: engine.getLayout() };
}

export function getSsrAcceptanceEngine() {
	return getSsrAcceptanceFixture().engine;
}

/** Server output of the embedded form of the nested theme acceptance, on its own engine and theme. */
export function renderNestedThemeGuestHtml(options: NestedThemeFormOptions = {}): {
	html: string;
	layout: LayoutThemeLike;
} {
	return renderNestedThemeForm(nestedGuestLayout, options);
}

/** Server output of the same form on the page's own theme, to place below another theme's item. */
export function renderReenteredThemeHtml(): string {
	return renderNestedThemeForm(nestedHostTheme).html;
}

function renderNestedThemeForm(
	layout: Parameters<typeof createSsrAcceptanceEngine>[0],
	options: NestedThemeFormOptions = {},
): { html: string; layout: LayoutThemeLike } {
	const engine = createSsrAcceptanceEngine(layout);
	const html = renderToStaticMarkup(
		<FormEngineProvider engine={engine}>
			<FormRenderer engine={engine} config={engine.validateForm(nestedThemeForm('ssr-input', options))} />
		</FormEngineProvider>,
	);
	return { html, layout: engine.getLayout() };
}

const THEMED_FORM = {
	id: 'themed',
	steps: [{ id: 'main', title: 'Main', elements: [{ $type: 'ssr-input', id: 'a', name: 'a', label: 'A' }] }],
};

/** Markup-only document of a subgrid acceptance form, on the theme its variant needs. */
export function renderSsrSubgridHtml(variant: SsrSubgridVariant): string {
	const engine = createSsrAcceptanceEngine(ssrSubgridLayout(variant));
	const body = renderToStaticMarkup(
		<FormEngineProvider engine={engine}>
			<FormRenderer engine={engine} config={engine.validateForm(ssrSubgridForm(variant, 'ssr-input'))} />
		</FormEngineProvider>,
	);
	return `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body>${body}</body></html>`;
}

/** One page holding a form per engine, to see how engines on shared or separate layout themes render together. */
export function renderSsrFormsOnOnePage(engines: Array<ReturnType<typeof createSsrAcceptanceEngine>>): string {
	return renderToStaticMarkup(
		<>
			{engines.map((engine, index) => (
				<FormEngineProvider key={index} engine={engine}>
					<FormRenderer engine={engine} config={engine.validateForm(THEMED_FORM)} />
				</FormEngineProvider>
			))}
		</>,
	);
}

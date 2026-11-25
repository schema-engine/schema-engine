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

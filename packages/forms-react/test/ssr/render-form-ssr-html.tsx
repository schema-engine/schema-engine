import { renderToStaticMarkup } from 'react-dom/server';
import { rhfAdapter } from '@/adapters/react-hook-form';
import { FormEngineProvider } from '@/components/form-engine-provider';
import { FormRenderer } from '@/components/internals/form-renderer';
import { nestedGuestLayout, nestedHostTheme, nestedThemeForm } from '../../../../test-utils/nested-theme-acceptance';
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
	const { engine, config, adapter } = getSsrAcceptanceFixture();
	const body = renderToStaticMarkup(
		<FormEngineProvider engine={engine} adapter={adapter}>
			<FormRenderer engine={engine} adapter={adapter} config={config} />
		</FormEngineProvider>,
	);

	return `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body>${body}</body></html>`;
}

/** Markup-only document for the named width fixture. */
export function renderSsrWidthsAcceptanceHtml(): string {
	const { engine, config, adapter } = getSsrWidthsFixture();
	const body = renderToStaticMarkup(
		<FormEngineProvider engine={engine} adapter={adapter}>
			<FormRenderer engine={engine} adapter={adapter} config={config} />
		</FormEngineProvider>,
	);

	return `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body>${body}</body></html>`;
}

/** Markup-only document for the nested width fixture: a fieldset and one array row. */
export function renderSsrNestedWidthsAcceptanceHtml(): string {
	const { engine, config, adapter } = getSsrNestedWidthsFixture();
	const body = renderToStaticMarkup(
		<FormEngineProvider engine={engine} adapter={adapter}>
			<FormRenderer engine={engine} adapter={adapter} config={config} defaultValues={{ rows: [{}] }} />
		</FormEngineProvider>,
	);

	return `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body>${body}</body></html>`;
}

/** Markup-only document for the drawn layout fixture. */
export function renderSsrAreasAcceptanceHtml(): string {
	const { engine, config, adapter } = getSsrAreasFixture();
	const body = renderToStaticMarkup(
		<FormEngineProvider engine={engine} adapter={adapter}>
			<FormRenderer engine={engine} adapter={adapter} config={config} />
		</FormEngineProvider>,
	);

	return `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body>${body}</body></html>`;
}

/** Markup-only document for the stepped fixture: one step with its own template and one without. */
export function renderSsrSteppedAcceptanceHtml(): string {
	const { engine, config, adapter } = getSsrSteppedFixture();
	const body = renderToStaticMarkup(
		<FormEngineProvider engine={engine} adapter={adapter}>
			<FormRenderer engine={engine} adapter={adapter} config={config} />
		</FormEngineProvider>,
	);

	return `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body>${body}</body></html>`;
}

export function getSsrAcceptanceEngine() {
	return getSsrAcceptanceFixture().engine;
}

/** Server output of the embedded form of the nested theme acceptance, on its own engine and theme. */
export function renderNestedThemeGuestHtml(authorClass: boolean): { html: string; layout: LayoutThemeLike } {
	return renderNestedThemeForm(nestedGuestLayout, authorClass);
}

/** Server output of the same form on the page's own theme, to place below another theme's item. */
export function renderReenteredThemeHtml(): string {
	return renderNestedThemeForm(nestedHostTheme, false).html;
}

function renderNestedThemeForm(
	layout: Parameters<typeof createSsrAcceptanceEngine>[0],
	authorClass: boolean,
): { html: string; layout: LayoutThemeLike } {
	const engine = createSsrAcceptanceEngine(layout);
	const html = renderToStaticMarkup(
		<FormEngineProvider engine={engine} adapter={rhfAdapter}>
			<FormRenderer
				engine={engine}
				adapter={rhfAdapter}
				config={engine.validateForm(nestedThemeForm('ssr-input', authorClass))}
			/>
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
				<FormEngineProvider key={index} engine={engine} adapter={rhfAdapter}>
					<FormRenderer engine={engine} adapter={rhfAdapter} config={engine.validateForm(THEMED_FORM)} />
				</FormEngineProvider>
			))}
		</>,
	);
}

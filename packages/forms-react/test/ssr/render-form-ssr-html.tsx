import { renderToStaticMarkup } from 'react-dom/server';
import { FormEngineProvider } from '@/components/form-engine-provider';
import { FormRenderer } from '@/components/internals/form-renderer';
import { getSsrAcceptanceFixture, getSsrNestedWidthsFixture, getSsrWidthsFixture } from './ssr-fixture';

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

export function getSsrAcceptanceEngine() {
	return getSsrAcceptanceFixture().engine;
}

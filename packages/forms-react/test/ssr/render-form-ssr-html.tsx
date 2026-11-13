import { renderToStaticMarkup } from 'react-dom/server';
import { rhfAdapter } from '@/adapters/react-hook-form';
import { FormEngineProvider } from '@/components/form-engine-provider';
import { FormRenderer } from '@/components/internals/form-renderer';
import {
	type createSsrAcceptanceEngine,
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

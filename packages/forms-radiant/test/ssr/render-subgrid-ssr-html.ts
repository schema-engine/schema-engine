import { renderToString } from '@ecopages/jsx/server';
import {
	withRadiantServerCustomElementRenderBridge,
	withServerRadiantElementSsrRuntime,
} from '@ecopages/radiant/server/radiant-element-ssr';
import { FormRenderer } from '@/components/internals/form-renderer';
import { createRadiantFormEngine } from '@/registries/builder-registry';
import { schemaFormRegistrations } from '@/registrations';
import { ssrSubgridForm, ssrSubgridLayout, type SsrSubgridVariant } from '../../../../test-utils/ssr-grid-fixtures';

/**
 * SSR document of a subgrid acceptance form, produced by the real fieldset renderer, on the theme its variant needs.
 *
 * @remarks
 * Rendered in Node, since Radiant's server renderer needs `node:async_hooks`.
 */
export function renderSsrSubgridHtml(variant: SsrSubgridVariant): string {
	const engine = createRadiantFormEngine({ elements: schemaFormRegistrations, layout: ssrSubgridLayout(variant) });
	const config = engine.validateForm(ssrSubgridForm(variant, 'input', { inputType: 'text' }));
	const body = withServerRadiantElementSsrRuntime(() =>
		withRadiantServerCustomElementRenderBridge(() =>
			renderToString(FormRenderer({ config, engine }), { mode: 'hydrate' }),
		),
	);
	return `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body>${body}</body></html>`;
}

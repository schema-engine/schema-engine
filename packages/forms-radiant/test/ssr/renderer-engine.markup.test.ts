import { expect, test } from 'vitest';
import { renderToString } from '@ecopages/jsx/server';
import { jsx } from '@ecopages/jsx/jsx-runtime';
import { withRadiantServerCustomElementRenderBridge } from '@ecopages/radiant/server/radiant-element-ssr';
import { FormRenderer } from '@/components/internals/form-renderer';
import { createRadiantFormEngine } from '@/registries/builder-registry';

test('the renderer does not serialize the live engine into its markup', () => {
	const engine = createRadiantFormEngine();
	const config = engine.validateForm({ id: 'engine-markup', steps: [{ id: 'main', title: 'Main', elements: [] }] });

	const html = withRadiantServerCustomElementRenderBridge(() =>
		renderToString(jsx(FormRenderer, { engine, config })),
	);

	const renderer = String(html).match(/<se-form-renderer[^>]*>/)?.[0];
	expect(renderer).toBeDefined();
	expect(renderer).not.toContain('engine=');
});

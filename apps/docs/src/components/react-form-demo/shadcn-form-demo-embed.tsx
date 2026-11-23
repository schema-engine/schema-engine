import { eco } from '@ecopages/core';
import type { JsxRenderable } from '@ecopages/jsx';
import { EcoEmbed } from '@ecopages/ecopages-jsx/eco-embed';
import type { FormConfig } from '@schema-engine/forms';
import { ReactFormDemoRoot } from './react-form-demo-root';
import { ShadcnFormPreview } from './shadcn-form-preview.react';

/**
 * MDX-facing wrapper for a live React form rendered by the copied shadcn registry source.
 *
 * @remarks
 * Apart from `ReactFormDemoEmbed` so the shadcn engine, Base UI and the recipe and control
 * stylesheets reach only the pages that use it. Nothing statically imported by the docs page may
 * reach this module: the page collects the CSS of the components it imports for every route. The
 * docs page loads it with a dynamic import for the pages in `REACT_DEMO_PAGES`.
 */
export const ShadcnFormDemoEmbed = eco.component<{ config: FormConfig }, JsxRenderable>({
	dependencies: {
		components: [ShadcnFormPreview],
		scripts: ['./react-form-demo-embed.script.ts'],
	},
	render: ({ config }) => (
		<ReactFormDemoRoot config={config} kit="shadcn">
			<EcoEmbed component={ShadcnFormPreview} props={{ config }} />
		</ReactFormDemoRoot>
	),
});

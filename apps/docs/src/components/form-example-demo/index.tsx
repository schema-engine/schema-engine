import { eco } from '@ecopages/core';
import type { JsxRenderable } from '@ecopages/jsx';
import type { FormConfig } from '@schema-engine/forms';
import { FormRendererPreview } from '@/components/form-renderer';
import { ReactFormDemoEmbed } from '@/components/react-form-demo/react-form-demo-embed';
import { RendererTabs } from '@/components/renderer-tabs';
import './form-example-demo.css';

/**
 * The live demos of a forms example: its config rendered in React and in Radiant, filling the width of the page.
 *
 * @remarks
 * The demos render the object the example's config file exports, with the docs' styled kit for each renderer. The
 * example's own files, with their plain widgets, run in the browser tests of the example, so the demos do not run its
 * submit code. The note under the demos says so once, for every page that uses them.
 *
 * Side by side when the content column is wide enough for two forms, and otherwise one at a time under the tabs of
 * {@link RendererTabs}, which decides it from its own width. React is the tab shown first.
 *
 * A page shows an example's stylesheet by importing it, so a page loads only the CSS of its own example.
 */
export const FormExampleDemo = eco.component<{ config: FormConfig }, JsxRenderable>({
	render: ({ config }) => (
		<div class="example-demo not-prose unstyled" data-example={config.id}>
			<RendererTabs name={config.id} sideBySide>
				<figure class="example-demo__demo" data-renderer="react">
					<ReactFormDemoEmbed config={config} />
				</figure>
				<figure class="example-demo__demo" data-renderer="radiant">
					<FormRendererPreview config={config} />
				</figure>
			</RendererTabs>
			<p class="example-demo__note">
				The demos use this site&apos;s styled widgets, not the example&apos;s own files, and send to no real
				server: a valid submit shows its values or posts to a mock endpoint.
			</p>
		</div>
	),
});

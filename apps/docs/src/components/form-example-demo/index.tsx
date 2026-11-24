import { eco } from '@ecopages/core';
import type { JsxRenderable } from '@ecopages/jsx';
import type { FormConfig } from '@schema-engine/forms';
import { FormRendererPreview } from '@/components/form-renderer';
import { ReactFormDemoEmbed } from '@/components/react-form-demo/react-form-demo-embed';
import './form-example-demo.css';

/**
 * The live demos of a forms example: its config rendered in React and in Radiant, side by side.
 *
 * @remarks
 * Both demos render the object the example's config file exports, with the docs' styled kit for each renderer. The
 * example's own files, with their plain widgets, run in the browser tests of the example, so the demos do not run its
 * submit code. The note under the demos says so once, for every page that uses them.
 */
export const FormExampleDemo = eco.component<{ config: FormConfig }, JsxRenderable>({
	render: ({ config }) => (
		<div class="example-demo not-prose unstyled" data-example={config.id}>
			<div class="example-demo__demos">
				<figure class="example-demo__demo" data-renderer="react">
					<figcaption class="example-demo__caption">React</figcaption>
					<ReactFormDemoEmbed config={config} />
				</figure>
				<figure class="example-demo__demo" data-renderer="radiant">
					<figcaption class="example-demo__caption">Radiant</figcaption>
					<FormRendererPreview config={config} />
				</figure>
			</div>
			<p class="example-demo__note">
				The demos use this site&apos;s styled widgets, not the example&apos;s own files, and send to no real
				server: a valid submit shows its values or posts to a mock endpoint.
			</p>
		</div>
	),
});

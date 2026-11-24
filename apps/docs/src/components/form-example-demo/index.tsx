import { eco } from '@ecopages/core';
import type { JsxRenderable } from '@ecopages/jsx';
import type { FormConfig } from '@schema-engine/forms';
import { FormRendererPreview } from '@/components/form-renderer';
import { ReactFormDemoEmbed } from '@/components/react-form-demo/react-form-demo-embed';
import './form-example-demo.css';

type Renderer = 'react' | 'radiant';

interface FormExampleDemoProps {
	config: FormConfig;
	/** The renderers that show the config, side by side. Both, by default. */
	renderers?: readonly Renderer[];
	/** The label above the demo. Without it, the renderer's name when two renderers are shown. */
	caption?: string;
}

const RENDERER_NAMES: Record<Renderer, string> = { react: 'React', radiant: 'Radiant' };

const label = (renderer: Renderer, renderers: readonly Renderer[], caption: string | undefined) =>
	caption ?? (renderers.length > 1 ? RENDERER_NAMES[renderer] : undefined);

/**
 * The live demos of a forms example: its config rendered in React and in Radiant, side by side.
 *
 * @remarks
 * The demos render the object the example's config file exports, with the docs' styled kit for each renderer. The
 * example's own files, with their plain widgets, run in the browser tests of the example, so the demos do not run its
 * submit code. The note under the demos says so once, for every page that uses them.
 *
 * A page shows an example's stylesheet by importing it, so a page loads only the CSS of its own example. A config
 * that needs an element or an engine the React demo kit lacks is shown in `renderers={['radiant']}` only.
 */
export const FormExampleDemo = eco.component<FormExampleDemoProps, JsxRenderable>({
	render: ({ config, renderers = ['react', 'radiant'], caption }) => (
		<div class="example-demo not-prose unstyled" data-example={config.id}>
			<div class="example-demo__demos">
				{renderers.map((renderer) => (
					<figure class="example-demo__demo" data-renderer={renderer}>
						{label(renderer, renderers, caption) ? (
							<figcaption class="example-demo__caption">{label(renderer, renderers, caption)}</figcaption>
						) : null}
						{renderer === 'react' ? (
							<ReactFormDemoEmbed config={config} />
						) : (
							<FormRendererPreview config={config} />
						)}
					</figure>
				))}
			</div>
			<p class="example-demo__note">
				The demos use this site&apos;s styled widgets, not the example&apos;s own files, and send to no real
				server: a valid submit shows its values or posts to a mock endpoint.
			</p>
		</div>
	),
});

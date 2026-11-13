import { eco } from '@ecopages/core';
import type { JsxRenderable } from '@ecopages/jsx';
import { EcoEmbed } from '@ecopages/ecopages-jsx/eco-embed';
import type { FormConfig } from '@schema-engine/forms/schemas';
import { ReactFormPreview } from './react-form-preview.react';

/**
 * MDX-facing wrapper for Forms React live demos.
 *
 * @remarks
 * Ecopages JSX owns the demo root element so static builds emit the serialized
 * config and hydration markers Ecopages React islands omit on cross-integration
 * embeds. {@link ReactFormPreview} still performs React SSR inside the shell.
 *
 * Embedding through `@ecopages/react/eco-embed` was tried on Ecopages 0.7.0 and
 * does not fit: that `EcoEmbed` returns a React node, which is not a valid JSX
 * element type in an Ecopages JSX file (the type check fails), and it is meant
 * for React files that embed foreign components. The Ecopages JSX `EcoEmbed`
 * stays, with the client hydration script, until a React-to-JSX embed exists.
 */
export const ReactFormDemoEmbed = eco.component<{ config: FormConfig }, JsxRenderable>({
	dependencies: {
		components: [ReactFormPreview],
		scripts: ['./react-form-demo-embed.script.ts'],
	},
	render: ({ config }) => {
		const serializedConfig = JSON.stringify(config);
		return (
			<div
				class="not-prose unstyled docs-react-form-demo"
				data-se-react-form-demo-root="true"
				data-se-form-config={serializedConfig}
			>
				<EcoEmbed component={ReactFormPreview} props={{ config }} />
			</div>
		);
	},
});

import { eco } from '@ecopages/core';
import type { JsxRenderable } from '@ecopages/jsx';
import { EcoEmbed } from '@ecopages/ecopages-jsx/eco-embed';
import type { FormConfig } from '@schema-engine/forms/schemas';
import { ReactFormDemoRoot } from './react-form-demo-root';
import { ReactFormPreview } from './react-form-preview.react';

/**
 * MDX-facing wrapper for Forms React live demos.
 *
 * @remarks
 * {@link ReactFormDemoRoot} owns the root element; {@link ReactFormPreview} still performs React SSR
 * inside it.
 *
 * Embedding through `@ecopages/react/eco-embed` was checked on Ecopages 0.8.0 and
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
	render: ({ config }) => (
		<ReactFormDemoRoot config={config} kit="demo">
			<EcoEmbed component={ReactFormPreview} props={{ config }} />
		</ReactFormDemoRoot>
	),
});

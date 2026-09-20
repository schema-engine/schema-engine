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

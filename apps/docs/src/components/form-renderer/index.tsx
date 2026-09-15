import { eco } from '@ecopages/core';
import type { JsxRenderable } from '@ecopages/jsx';
import { FormRenderer } from '@schema-engine/forms-radiant';
import { formEngine, radiantAdapter } from '@/lib/form-engine-setup';
import type { FormConfig } from '@schema-engine/forms/schemas';
import './form-renderer-preview.css';

/**
 * Live Radiant form preview.
 *
 * @remarks
 * The docs app renders with the default Ecopages JSX integration, so this is a
 * regular page component, not an island: the form tree is authored here as
 * light-DOM children and expands on the server. The page script wires the
 * engine, adapter, and mock submission API after hydration. The configuration
 * is declared inline in the demo page and passed as a prop, so the documented
 * snippet and the interactive demo share the same data.
 */
export const FormRendererPreview = eco.component<{ config: FormConfig }, JsxRenderable>({
	render: ({ config }) => {
		return (
			<div class="not-prose unstyled">
				<div class="docs-form-renderer-preview">
					<FormRenderer engine={formEngine} adapter={radiantAdapter} config={config} />
				</div>
			</div>
		);
	},
});

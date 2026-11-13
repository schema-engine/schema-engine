import { eco } from '@ecopages/core';
import type { JsxRenderable } from '@ecopages/jsx';
import { FormRenderer } from '@schema-engine/forms-radiant';
import { docsEngines } from '@/lib/form-engine-setup';
import type { DocsEngineName } from '@/lib/recipes/catalog';
import type { FormConfig } from '@schema-engine/forms/schemas';
import './form-renderer-preview.css';

/**
 * Live Radiant form preview.
 *
 * @remarks
 * The docs app renders with the default Ecopages JSX integration (no React
 * `@jsxImportSource` pragma). This is a regular page component, not an island:
 * the form tree is authored here as
 * light-DOM children and expands on the server. The page script wires the
 * engine and mock submission API after hydration. The configuration
 * is declared inline in the demo page and passed as a prop, so the documented
 * snippet and the interactive demo share the same data. `engine` names one of the docs
 * Radiant engines; the preview binding on the client assigns the same one.
 */
export const FormRendererPreview = eco.component<{ config: FormConfig; engine?: DocsEngineName }, JsxRenderable>({
	render: ({ config, engine = 'default' }) => {
		return (
			<div class="not-prose unstyled" data-docs-engine={engine}>
				<div class="docs-form-renderer-preview">
					<FormRenderer engine={docsEngines[engine]} config={config} />
				</div>
			</div>
		);
	},
});

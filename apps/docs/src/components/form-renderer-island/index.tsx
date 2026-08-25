import { eco } from '@ecopages/core';
import type { JsxRenderable } from '@ecopages/jsx';
import type { PreviewId } from './preview-configs';
// oxlint-disable-next-line import/no-unassigned-import -- custom-element types
import './form-renderer-island.script';

export const FormRendererIsland = eco.component<{ preview: PreviewId }, JsxRenderable>({
	dependencies: {
		scripts: ['./form-renderer-island.script.tsx'],
		stylesheets: ['./form-renderer-island.css'],
	},
	render: ({ preview }) => (
		<div class="not-prose">
			<docs-form-renderer class="docs-form-renderer" data-preview={preview}>
				<div class="docs-form-renderer__mount" data-mount />
			</docs-form-renderer>
		</div>
	),
});

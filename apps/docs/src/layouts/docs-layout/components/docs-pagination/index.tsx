import { eco } from '@ecopages/core';
import type { JsxRenderable } from '@ecopages/jsx';
// oxlint-disable-next-line import/no-unassigned-import -- custom-element types
import './docs-pagination.script';

export const DocsPagination = eco.component<Record<string, never>, JsxRenderable>({
	dependencies: {
		scripts: ['./docs-pagination.script.tsx'],
	},
	render: () => {
		return <radiant-docs-pagination class="docs-layout__pagination" />;
	},
});

import { eco } from '@ecopages/core';
import type { JsxRenderable } from '@ecopages/jsx';
import { renderPage } from '@/lib/examples/layout-page/host';
import { dashboard } from '@/lib/examples/layout-page/page';
import { theme } from '@/lib/examples/layout-page/theme';
import './layout-page-demo.css';

const FRAME_STYLE = `body{margin:1rem;font-family:system-ui,sans-serif}.se-grid-item{padding:.75rem;border:1px dashed #8a8a8a;border-radius:.375rem}h1,h2,p{margin:0}h1{font-size:1.25rem}h2{font-size:1rem}`;

const frame = `<!doctype html><meta name="viewport" content="width=device-width, initial-scale=1"><style>${theme.css}</style><style>${FRAME_STYLE}</style>${renderPage(dashboard)}`;

/**
 * The page of the layout page example, in a frame whose width the reader can drag.
 *
 * @remarks
 * The theme's breakpoints are media queries of the viewport, so the page sits in an iframe: its viewport is the
 * frame, and resizing the frame crosses the breakpoints.
 */
export const LayoutPageDemo = eco.component<Record<string, never>, JsxRenderable>({
	render: () => (
		<iframe
			class="layout-page-demo not-prose unstyled"
			title="The dashboard, laid out by the layout theme"
			srcdoc={frame}
		/>
	),
});

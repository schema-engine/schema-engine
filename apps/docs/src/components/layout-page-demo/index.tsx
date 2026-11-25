import { eco } from '@ecopages/core';
import type { JsxRenderable } from '@ecopages/jsx';
import { renderToStaticMarkup } from 'react-dom/server';
import { renderPage } from '@/lib/examples/layout-page/host.react';
import { dashboard } from '@/lib/examples/layout-page/page';
import { theme } from '@/lib/examples/layout-page/theme';
import './layout-page-demo.css';

const FRAME_STYLE = `:root{color-scheme:light dark}body{margin:0;padding:1rem;background:Canvas;color:CanvasText;font-family:system-ui,sans-serif}.se-grid-item{padding:.75rem;border:1px dashed GrayText;border-radius:.375rem}h1,h2,p{margin:0}h1{font-size:1.25rem}h2{font-size:1rem}`;

const frame = `<!doctype html><meta name="viewport" content="width=device-width, initial-scale=1"><style>${theme.css}</style><style>${FRAME_STYLE}</style>${renderToStaticMarkup(renderPage(dashboard))}`;

/**
 * The widths the frame can be shown at: a desktop, where the theme's `lg` breakpoint is crossed, a tablet, past `md`
 * only, and a phone. The first is the one the frame opens at.
 */
const WIDTHS = [
	{ label: 'Desktop', width: 1200 },
	{ label: 'Tablet', width: 900 },
	{ label: 'Phone', width: 400 },
] as const;

/**
 * The page of the layout page example, in a frame at a chosen width, shrunk to fit the column.
 *
 * @remarks
 * The theme's breakpoints are media queries of the viewport, so the page sits in an iframe: its viewport is the frame,
 * and a frame as wide as a desktop crosses the same breakpoints a desktop does. The frame keeps that width and
 * `layout-page-demo.script.ts` scales it to the width of the column and gives it the height of the page inside, so the
 * page shows whole at the size it has on a screen; the radio inputs choose a narrower width to see the other layouts.
 * Without the script the frame is at full size, at a fixed height, and scrolls.
 */
export const LayoutPageDemo = eco.component<Record<string, never>, JsxRenderable>({
	dependencies: {
		scripts: ['./layout-page-demo.script.ts'],
	},
	render: () => (
		<div class="layout-page-demo not-prose unstyled" style={`--frame-width:${WIDTHS[0].width}px`}>
			<div class="radio-tabs" role="radiogroup" aria-label="Frame width">
				{WIDTHS.map(({ label, width }) => (
					<label class="radio-tabs__tab">
						<input
							type="radio"
							name="layout-page-width"
							value={String(width)}
							checked={width === WIDTHS[0].width}
						/>
						<span>{`${label} ${width}px`}</span>
					</label>
				))}
			</div>
			<div class="layout-page-demo__viewport">
				<iframe
					class="layout-page-demo__frame"
					title="The dashboard, laid out by the layout theme"
					srcdoc={frame}
				/>
			</div>
		</div>
	),
});

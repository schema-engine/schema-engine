import { eco } from '@ecopages/core';
import type { JsxRenderable } from '@ecopages/jsx';
import './renderer-tabs.css';

interface RendererTabsProps {
	name: string;
	/** Shows both panels next to each other, without the tabs, when the tabs have room for two forms. */
	sideBySide?: boolean;
	children?: JsxRenderable;
}

/**
 * Two tabs, React and Radiant, over the panels a page writes inside it.
 *
 * @remarks
 * A page puts `<div data-renderer="react">` and `<div data-renderer="radiant">` inside, each holding fenced code,
 * so the code stays in the Markdown export. The tabs are radio inputs and the stylesheet shows the checked
 * renderer's panel, so they work before any script loads and need none. `name` keeps the radio group of one
 * example apart from another's.
 *
 * `sideBySide` is for live demos: when the tabs are wide enough for two forms at a real width, the stylesheet
 * hides the tabs and shows both panels in two columns, each labelled by a `.renderer-tabs__caption` the page puts first inside the panel. The width is the width of
 * the tabs themselves, not the viewport, so it follows the sidebar and the table of contents of the docs layout.
 */
export const RendererTabs = eco.component<RendererTabsProps, JsxRenderable>({
	render: ({ name, sideBySide = false, children }) => (
		<div class="renderer-tabs not-prose unstyled" data-side-by-side={sideBySide ? '' : undefined}>
			<div class="renderer-tabs__list" role="radiogroup" aria-label="Renderer">
				<label class="renderer-tabs__tab">
					<input type="radio" name={`${name}-renderer`} value="react" checked />
					<span>React</span>
				</label>
				<label class="renderer-tabs__tab">
					<input type="radio" name={`${name}-renderer`} value="radiant" />
					<span>Radiant</span>
				</label>
			</div>
			<div class="renderer-tabs__panels">{children}</div>
		</div>
	),
});

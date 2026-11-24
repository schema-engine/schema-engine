import { eco } from '@ecopages/core';
import type { JsxRenderable } from '@ecopages/jsx';
import './renderer-tabs.css';

/**
 * Two tabs, React and Radiant, over the panels a page writes inside it.
 *
 * @remarks
 * A page puts `<div data-renderer="react">` and `<div data-renderer="radiant">` inside, each holding fenced code,
 * so the code stays in the Markdown export. The tabs are radio inputs and the stylesheet shows the checked
 * renderer's panel, so they work before any script loads and need none. `name` keeps the radio group of one
 * recipe apart from another's.
 */
export const RendererTabs = eco.component<{ name: string; children?: JsxRenderable }, JsxRenderable>({
	render: ({ name, children }) => (
		<div class="renderer-tabs not-prose unstyled">
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

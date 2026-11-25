import { eco } from '@ecopages/core';
import type { JsxRenderable } from '@ecopages/jsx';
import './renderer-tabs.css';

/** The renderers a page shows, in the order of the tabs. The same labels name the tabs and the side-by-side columns. */
const RENDERERS = [
	{ value: 'react', label: 'React' },
	{ value: 'radiant', label: 'Radiant' },
] as const;

interface RendererTabsProps {
	name: string;
	/** Shows both panels next to each other, without the tabs, when the tabs have room for two forms. */
	sideBySide?: boolean;
	/** A line under the panels, such as what the demos have in common. */
	note?: JsxRenderable;
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
 * hides the tabs and shows both panels in two columns, each named by a caption above it. The width is the width of
 * the tabs themselves, not the viewport, so it follows the sidebar and the table of contents of the docs layout.
 */
export const RendererTabs = eco.component<RendererTabsProps, JsxRenderable>({
	render: ({ name, sideBySide = false, note, children }) => (
		<div class="renderer-tabs not-prose unstyled" data-side-by-side={sideBySide ? '' : undefined}>
			<div class="renderer-tabs__list radio-tabs" role="radiogroup" aria-label="Renderer">
				{RENDERERS.map(({ value, label }) => (
					<label class="radio-tabs__tab">
						<input
							type="radio"
							name={`${name}-renderer`}
							value={value}
							checked={value === RENDERERS[0].value}
						/>
						<span>{label}</span>
					</label>
				))}
			</div>
			{sideBySide ? (
				<div class="renderer-tabs__captions">
					{RENDERERS.map(({ label }) => (
						<span>{label}</span>
					))}
				</div>
			) : null}
			<div class="renderer-tabs__panels">{children}</div>
			{note ? <p class="renderer-tabs__note">{note}</p> : null}
		</div>
	),
});

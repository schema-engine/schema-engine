import type { JsxRenderable } from '@ecopages/jsx';
import { GRID_CONTAINER_CLASS, getDefaultLayoutTheme } from '@schema-engine/layout';
import type { FormEngineRuntime as FormEngine } from '@schema-engine/forms';
import { resolveFormEngine } from '@/contexts/resolve-form-engine';

/**
 * Wraps one grid in the element a `query: 'container'` layout theme measures its breakpoints against.
 *
 * @remarks
 * Renders only its children when the theme queries the viewport, so the markup of a media theme is
 * unchanged. Put it around each grid (a step's, a fieldset's, an array row's), nested grids
 * included, so every grid follows its own box. The theme comes from the given engine, else the
 * engine rendering this element, else the library default.
 */
export function GridContainer({ engine, children }: { engine?: FormEngine; children?: JsxRenderable }): JsxRenderable {
	const layout = (engine ?? resolveFormEngine())?.getLayout() ?? getDefaultLayoutTheme();
	if (layout.grid.query !== 'container') return <>{children}</>;
	return (
		<div class={GRID_CONTAINER_CLASS} data-se-theme={layout.id}>
			{children}
		</div>
	);
}

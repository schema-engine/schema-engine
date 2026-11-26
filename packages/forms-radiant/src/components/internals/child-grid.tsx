import type { JsxRenderable } from '@ecopages/jsx';
import { GRID_CLASS, getDefaultLayoutTheme, getGridVariables } from '@schema-engine/layout';
import type { FormEngineRuntime as FormEngine } from '@schema-engine/forms';
import { resolveFormEngine } from '@/contexts/resolve-form-engine';
import { GridContainer } from './grid-container';

export interface ChildGridProps {
	/** The elements the grid places, which decide its tracks. */
	elements: readonly unknown[];
	/** The engine whose layout theme applies; else the engine rendering this element, else the library default. */
	engine?: FormEngine;
	/** Classes put on the grid element before `se-form-grid se-grid`. */
	class?: string;
	children?: JsxRenderable;
}

/**
 * The grid of a container element's children, such as a fieldset's or an array row's.
 *
 * @remarks
 * The grid lays its direct children out the way a step does. It takes twelve tracks when an element sets `width`
 * or `offset` and otherwise stays the engine's single column. The theme comes from the given engine, else the engine
 * rendering this element, else the library default. Under a `query: 'container'` layout theme it also renders the
 * `se-grid-container` wrapper around the grid, so the breakpoints follow that wrapper and a nested grid follows its
 * own box; under a theme that queries the window it renders the grid alone.
 */
export function ChildGrid({ elements, engine, class: className, children }: ChildGridProps): JsxRenderable {
	const owner = engine ?? resolveFormEngine();
	const layout = owner?.getLayout() ?? getDefaultLayoutTheme();
	return (
		<GridContainer engine={owner}>
			<div
				class={`${className ? `${className} ` : ''}se-form-grid ${GRID_CLASS}`}
				data-se-theme={layout.id}
				style={getGridVariables(undefined, layout.grid, elements)}
			>
				{children}
			</div>
		</GridContainer>
	);
}

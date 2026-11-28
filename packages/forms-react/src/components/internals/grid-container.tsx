import type React from 'react';
import { GRID_CONTAINER_CLASS, getDefaultLayoutTheme } from '@schema-engine/layout';
import { useOptionalFormEngine } from '../../hooks/use-form-context.js';

/**
 * Wraps one grid in the element a `query: 'container'` layout theme measures its breakpoints against.
 *
 * @remarks
 * Renders only its children when the engine's theme queries the viewport, so the markup of a media
 * theme is unchanged. The step grid uses it directly; the grid of a container element gets it
 * through `ChildGrid`. The theme comes from the engine context, with the library default outside a
 * `FormEngineProvider`.
 */
export function GridContainer({ children }: { children: React.ReactNode }) {
	const layout = useOptionalFormEngine()?.engine.getLayout() ?? getDefaultLayoutTheme();
	if (layout.grid.query !== 'container') return <>{children}</>;
	return (
		<div className={GRID_CONTAINER_CLASS} data-se-theme={layout.id}>
			{children}
		</div>
	);
}

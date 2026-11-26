import type React from 'react';
import { GRID_CONTAINER_CLASS, getDefaultLayoutTheme } from '@schema-engine/layout';
import { useOptionalFormEngine } from '@/hooks/use-form-context';

/**
 * Wraps one grid in the element a `query: 'container'` layout theme measures its breakpoints against.
 *
 * @remarks
 * Renders only its children when the engine's theme queries the viewport, so the markup of a media
 * theme is unchanged. Put it around each grid (a step's, a fieldset's, an array row's), nested
 * grids included, so every grid follows its own box. The theme comes from the engine context, with
 * the library default outside a `FormEngineProvider`.
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

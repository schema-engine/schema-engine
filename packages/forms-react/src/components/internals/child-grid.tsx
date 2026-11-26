import type React from 'react';
import { GRID_CLASS, getDefaultLayoutTheme, getGridVariables } from '@schema-engine/layout';
import { useOptionalFormEngine } from '@/hooks/use-form-context';
import { GridContainer } from './grid-container';

export interface ChildGridProps {
	/** The elements the grid places, which decide its tracks. */
	elements: readonly unknown[];
	/** Classes added to the grid element, after `se-form-grid se-grid`. */
	className?: string;
	children?: React.ReactNode;
}

/**
 * The grid of a container element's children, such as a fieldset's or an array row's.
 *
 * @remarks
 * The grid lays its direct children out the way a step does. It takes twelve tracks when an element sets `width`
 * or `offset` and otherwise stays the engine's single column. The theme comes from the engine context, with the
 * library default outside a `FormEngineProvider`. Under a `query: 'container'` layout theme it also renders the
 * `se-grid-container` wrapper around the grid, so the breakpoints follow that wrapper and a nested grid follows
 * its own box; under a theme that queries the window it renders the grid alone.
 */
export function ChildGrid({ elements, className, children }: ChildGridProps) {
	const layout = useOptionalFormEngine()?.engine.getLayout() ?? getDefaultLayoutTheme();
	return (
		<GridContainer>
			<div
				className={className ? `se-form-grid ${GRID_CLASS} ${className}` : `se-form-grid ${GRID_CLASS}`}
				data-se-theme={layout.id}
				style={getGridVariables(undefined, layout.grid, elements)}
			>
				{children}
			</div>
		</GridContainer>
	);
}

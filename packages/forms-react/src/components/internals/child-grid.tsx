import type React from 'react';
import { useChildGridProps } from '@/hooks/use-form-context';
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
 * Renders the element of {@link useChildGridProps}, so the grid takes twelve tracks when an element sets `width`
 * or `offset` and otherwise stays the engine's single column. Under a `query: 'container'` layout theme it also
 * renders the `se-grid-container` wrapper around the grid, so the breakpoints follow that wrapper and a nested
 * grid follows its own box; under a theme that queries the window it renders the grid alone.
 */
export function ChildGrid({ elements, className, children }: ChildGridProps) {
	const grid = useChildGridProps(elements);
	return (
		<GridContainer>
			<div {...grid} className={className ? `${grid.className} ${className}` : grid.className}>
				{children}
			</div>
		</GridContainer>
	);
}

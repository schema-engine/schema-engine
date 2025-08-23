import type React from 'react';
import { useEffect, useState, useContext, createContext } from 'react';
import type { GridLayoutConfig, FieldGridConfig } from './types/form';

export type Breakpoint = 'default' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

export const BREAKPOINTS = {
	default: 0,
	sm: 640,
	md: 768,
	lg: 1024,
	xl: 1280,
	'2xl': 1536,
} as const;

/**
 * Breakpoint override context for ViewportPreview
 */
const BreakpointOverrideContext = createContext<Breakpoint | undefined>(undefined);

/**
 * Provider for breakpoint override
 */
export const BreakpointOverrideProvider = BreakpointOverrideContext.Provider;

/**
 * Gets the current breakpoint based on window width
 */
function getCurrentBreakpoint(width: number): Breakpoint {
	// Order breakpoints from largest to smallest for proper detection
	if (width >= BREAKPOINTS['2xl']) return '2xl';
	if (width >= BREAKPOINTS.xl) return 'xl';
	if (width >= BREAKPOINTS.lg) return 'lg';
	if (width >= BREAKPOINTS.md) return 'md';
	if (width >= BREAKPOINTS.sm) return 'sm';
	return 'default';
}

/**
 * Hook to get current breakpoint based on window size or override
 */
export function useBreakpoint(): Breakpoint {
	const overrideBreakpoint = useContext(BreakpointOverrideContext);

	const [breakpoint, setBreakpoint] = useState<Breakpoint>(
		typeof window !== 'undefined' ? getCurrentBreakpoint(window.innerWidth) : 'default',
	);

	useEffect(() => {
		// Don't set up window listeners if we have an override
		if (overrideBreakpoint) return;

		if (typeof window === 'undefined') return;

		const handleResize = () => {
			setBreakpoint(getCurrentBreakpoint(window.innerWidth));
		};

		window.addEventListener('resize', handleResize);
		return () => window.removeEventListener('resize', handleResize);
	}, [overrideBreakpoint]);

	// Return override if available, otherwise actual breakpoint
	return overrideBreakpoint || breakpoint;
}

/**
 * Gets cascading responsive config - checks current breakpoint, then falls back to smaller breakpoints
 */
function getCascadingGridConfig(responsive: GridLayoutConfig['responsive'], currentBreakpoint: Breakpoint) {
	if (!responsive) return undefined;

	// Define breakpoint hierarchy (small to large)
	const breakpointOrder: Breakpoint[] = ['default', 'sm', 'md', 'lg', 'xl', '2xl'];
	const currentIndex = breakpointOrder.indexOf(currentBreakpoint);

	// Check from current breakpoint down to default
	for (let i = currentIndex; i >= 0; i--) {
		const bp = breakpointOrder[i];
		if (responsive[bp as keyof typeof responsive]) {
			return responsive[bp as keyof typeof responsive];
		}
	}

	return undefined;
}

/**
 * Hook that returns CSS grid styles for form containers
 */
export function useFormGridStyles(gridConfig?: GridLayoutConfig): React.CSSProperties {
	const currentBreakpoint = useBreakpoint();

	if (!gridConfig) {
		return {
			display: 'grid',
			gridTemplateColumns: '1fr',
			gap: '1rem',
		};
	}

	// Get cascading responsive config
	const responsiveConfig = getCascadingGridConfig(gridConfig.responsive, currentBreakpoint);
	const columns = responsiveConfig?.columns ?? gridConfig.columns ?? 1;
	const gap = (() => {
		const gapValue = responsiveConfig?.gap ?? gridConfig.gap;
		return typeof gapValue === 'number' ? `${gapValue}rem` : gapValue || '1rem';
	})();

	return {
		display: 'grid',
		gridTemplateColumns:
			columns === 'auto'
				? `repeat(auto-fit, minmax(${gridConfig.minColumnWidth || '250px'}, 1fr))`
				: `repeat(${columns}, 1fr)`,
		gap,
		justifyItems: gridConfig.justifyItems,
		alignItems: gridConfig.alignItems,
		justifyContent: gridConfig.justifyContent,
		alignContent: gridConfig.alignContent,
	};
}

/**
 * Gets cascading responsive field config - checks current breakpoint, then falls back to smaller breakpoints
 */
function getCascadingFieldConfig(responsive: FieldGridConfig['responsive'], currentBreakpoint: Breakpoint) {
	if (!responsive) return undefined;

	// Define breakpoint hierarchy (small to large)
	const breakpointOrder: Breakpoint[] = ['default', 'sm', 'md', 'lg', 'xl', '2xl'];
	const currentIndex = breakpointOrder.indexOf(currentBreakpoint);

	// Check from current breakpoint down to default
	for (let i = currentIndex; i >= 0; i--) {
		const bp = breakpointOrder[i];
		if (responsive[bp as keyof typeof responsive]) {
			return responsive[bp as keyof typeof responsive];
		}
	}

	return undefined;
}

/**
 * Hook that returns CSS grid positioning styles for individual fields
 */
export function useFieldGridStyles(fieldGridConfig?: FieldGridConfig): React.CSSProperties {
	const currentBreakpoint = useBreakpoint();

	if (!fieldGridConfig) {
		return {};
	}

	// Get cascading responsive config
	const responsiveConfig = getCascadingFieldConfig(fieldGridConfig.responsive, currentBreakpoint);

	if (responsiveConfig?.hidden) {
		return { display: 'none' };
	}

	const styles: React.CSSProperties = {};
	const column = responsiveConfig?.column ?? fieldGridConfig.column;
	const row = responsiveConfig?.row ?? fieldGridConfig.row;

	if (column) {
		styles.gridColumn = typeof column === 'number' ? column.toString() : column;
	}

	if (row) {
		styles.gridRow = typeof row === 'number' ? row.toString() : row;
	}

	const justifySelf = responsiveConfig?.justifySelf ?? fieldGridConfig.justifySelf;
	const alignSelf = responsiveConfig?.alignSelf ?? fieldGridConfig.alignSelf;

	if (justifySelf) styles.justifySelf = justifySelf;
	if (alignSelf) styles.alignSelf = alignSelf;
	if (fieldGridConfig.placeSelf) styles.placeSelf = fieldGridConfig.placeSelf;

	return styles;
}

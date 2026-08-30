import type React from 'react';
import { useEffect, useState, useContext, createContext, useMemo } from 'react';
import type { GridLayoutConfig, ElementGridConfig } from '@schema-engine/forms/schemas';
import { useDebounce } from './use-debounce';

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
 * Breakpoint order for cascading config lookups
 */
const BREAKPOINT_ORDER: Breakpoint[] = ['default', 'sm', 'md', 'lg', 'xl', '2xl'];

/**
 * Lets a wrapper pin the breakpoint used for grid resolution instead of
 * measuring the real viewport.
 */
const BreakpointOverrideContext = createContext<Breakpoint | undefined>(undefined);

/**
 * Provider for breakpoint override
 */
export const BreakpointOverrideProvider = BreakpointOverrideContext.Provider;

/**
 * Gets the current breakpoint based on window width
 */
function getCurrentBreakpoint(breakpoints: Record<Breakpoint, number>, width: number): Breakpoint {
	if (width >= breakpoints['2xl']) return '2xl';
	if (width >= breakpoints.xl) return 'xl';
	if (width >= breakpoints.lg) return 'lg';
	if (width >= breakpoints.md) return 'md';
	if (width >= breakpoints.sm) return 'sm';
	return 'default';
}

/**
 * Hook to get current breakpoint based on window size or override
 */
export function useBreakpoint(breakpoints: Record<Breakpoint, number> = BREAKPOINTS): Breakpoint {
	const overrideBreakpoint = useContext(BreakpointOverrideContext);

	const [breakpoint, setBreakpoint] = useState<Breakpoint>(
		typeof window !== 'undefined' ? getCurrentBreakpoint(breakpoints, window.innerWidth) : 'default',
	);

	const debouncedResize = useDebounce(() => {
		const newBreakpoint = getCurrentBreakpoint(breakpoints, window.innerWidth);
		setBreakpoint((current) => (current === newBreakpoint ? current : newBreakpoint));
	}, 100);

	useEffect(() => {
		if (overrideBreakpoint) return;

		if (typeof window === 'undefined') return;

		window.addEventListener('resize', debouncedResize);
		return () => window.removeEventListener('resize', debouncedResize);
	}, [overrideBreakpoint, debouncedResize]);

	return overrideBreakpoint || breakpoint;
}

/**
 * Gets cascading responsive config - checks current breakpoint, then falls back to smaller breakpoints
 */
function getCascadingGridConfig(responsive: GridLayoutConfig['responsive'], currentBreakpoint: Breakpoint) {
	if (!responsive) return undefined;

	const currentIndex = BREAKPOINT_ORDER.indexOf(currentBreakpoint);

	for (let i = currentIndex; i >= 0; i--) {
		const bp = BREAKPOINT_ORDER[i];
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

	return useMemo(() => {
		if (!gridConfig) {
			return {
				display: 'grid',
				gridTemplateColumns: '1fr',
				gap: '1rem',
				alignContent: 'start',
			};
		}

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
	}, [gridConfig, currentBreakpoint]);
}

/**
 * Gets cascading responsive field config - checks current breakpoint, then falls back to smaller breakpoints
 */
function getCascadingFieldConfig(responsive: ElementGridConfig['responsive'], currentBreakpoint: Breakpoint) {
	if (!responsive) return undefined;

	const currentIndex = BREAKPOINT_ORDER.indexOf(currentBreakpoint);

	for (let i = currentIndex; i >= 0; i--) {
		const bp = BREAKPOINT_ORDER[i];
		if (responsive[bp as keyof typeof responsive]) {
			return responsive[bp as keyof typeof responsive];
		}
	}

	return undefined;
}

/**
 * Hook that returns CSS grid positioning styles for individual fields
 */
export function useFieldGridStyles(fieldGridConfig?: ElementGridConfig): React.CSSProperties {
	const currentBreakpoint = useBreakpoint();

	return useMemo(() => {
		if (!fieldGridConfig) {
			return {};
		}

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
	}, [fieldGridConfig, currentBreakpoint]);
}

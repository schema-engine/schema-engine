import type { ElementGridConfig, GridLayoutConfig } from '@schema-engine/forms/schemas';

type Breakpoint = 'default' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
const BREAKPOINT_ORDER: Breakpoint[] = ['default', 'sm', 'md', 'lg', 'xl', '2xl'];

function getCascadingGridConfig(responsive: GridLayoutConfig['responsive'], currentBreakpoint: Breakpoint = 'default') {
	if (!responsive) return undefined;

	const currentIndex = BREAKPOINT_ORDER.indexOf(currentBreakpoint);
	for (let index = currentIndex; index >= 0; index -= 1) {
		const breakpoint = BREAKPOINT_ORDER[index];
		if (responsive[breakpoint as keyof typeof responsive]) {
			return responsive[breakpoint as keyof typeof responsive];
		}
	}

	return undefined;
}

export function getFormGridStyles(gridConfig?: GridLayoutConfig): Record<string, string | number | undefined> {
	if (!gridConfig) {
		return {
			display: 'grid',
			gridTemplateColumns: '1fr',
			gap: 'var(--space-stack, 1rem)',
			alignContent: 'start',
		};
	}

	const responsiveConfig = getCascadingGridConfig(gridConfig.responsive);
	const columns = responsiveConfig?.columns ?? gridConfig.columns ?? 1;
	const gapValue = responsiveConfig?.gap ?? gridConfig.gap;
	const gap = typeof gapValue === 'number' ? `${gapValue}rem` : gapValue || 'var(--space-stack, 1rem)';

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

function getCascadingFieldConfig(
	responsive: ElementGridConfig['responsive'],
	currentBreakpoint: Breakpoint = 'default',
) {
	if (!responsive) return undefined;

	const currentIndex = BREAKPOINT_ORDER.indexOf(currentBreakpoint);
	for (let index = currentIndex; index >= 0; index -= 1) {
		const breakpoint = BREAKPOINT_ORDER[index];
		if (responsive[breakpoint as keyof typeof responsive]) {
			return responsive[breakpoint as keyof typeof responsive];
		}
	}

	return undefined;
}

export function getFieldGridStyles(fieldGridConfig?: ElementGridConfig): Record<string, string | number | undefined> {
	if (!fieldGridConfig) {
		return {};
	}

	const responsiveConfig = getCascadingFieldConfig(fieldGridConfig.responsive);
	if (responsiveConfig?.hidden) {
		return { display: 'none' };
	}

	const styles: Record<string, string | number | undefined> = {};
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

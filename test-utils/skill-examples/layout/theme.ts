import {
	builtInAxes,
	createLayoutTheme,
	defineAxis,
	getAppearanceAttributes,
	getGridVariables,
	mergeAppearance,
} from '@schema-engine/layout';

const tone = defineAxis({
	$type: 'tone',
	metadata: { name: 'Tone' },
	default: 'neutral',
	values: { neutral: {}, brand: { '--se-accent': '#f60' } },
});

export const theme = createLayoutTheme({
	grid: { breakpoints: { md: '50rem' }, gap: { default: '1rem' } },
	appearance: [...builtInAxes, tone],
});

export const attributes = getAppearanceAttributes(mergeAppearance({ size: 'compact' }, { tone: 'brand' }));

export const containerStyle = getGridVariables({ columns: 2 }, theme.grid, []);

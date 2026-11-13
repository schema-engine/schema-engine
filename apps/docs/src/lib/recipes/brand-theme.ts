import { builtInAxes, createLayoutTheme, defineAxis } from '@schema-engine/layout';

/**
 * A host axis. Each value is a set of tokens: the colour roles Radiant UI (`--primary`, `--on-primary`) and a
 * shadcn theme (`--primary`, `--primary-foreground`) read.
 */
export const tone = defineAxis({
	$type: 'tone',
	metadata: { name: 'Tone', description: 'Accent colour of a form' },
	default: 'neutral',
	values: {
		neutral: {},
		brand: {
			'--primary': '#c2410c',
			'--on-primary': '#ffffff',
			'--primary-foreground': '#ffffff',
			'--primary-container': '#ffedd5',
			'--on-primary-container': '#7c2d12',
		},
		forest: {
			'--primary': '#15803d',
			'--on-primary': '#ffffff',
			'--primary-foreground': '#ffffff',
			'--primary-container': '#dcfce7',
			'--on-primary-container': '#14532d',
		},
	},
});

/** The compiled theme: the built-in `size` and `surface` axes plus `tone`. Pass it to every engine as `layout`. */
export const brandTheme = createLayoutTheme({ appearance: [...builtInAxes, tone] });

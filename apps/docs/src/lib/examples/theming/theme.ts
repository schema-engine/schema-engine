import { builtInAxes, createLayoutTheme, defineAxis } from '@schema-engine/layout';

/**
 * A host axis. Each value is a set of tokens: the colour roles Radiant UI (`--primary`, `--on-primary`) and a
 * shadcn theme (`--primary`, `--primary-foreground`) read.
 *
 * @remarks
 * An axis holds two to five values, so the tones are the neutral default and four accents. Every accent sets a white
 * `--on-primary` that reads at least 4.5:1 on its `--primary` (brand 5.2, forest 5.0, violet 7.1, ocean 5.9), and a
 * container pair that reads 7:1 or better.
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
		violet: {
			'--primary': '#6d28d9',
			'--on-primary': '#ffffff',
			'--primary-foreground': '#ffffff',
			'--primary-container': '#ede9fe',
			'--on-primary-container': '#4c1d95',
		},
		ocean: {
			'--primary': '#0369a1',
			'--on-primary': '#ffffff',
			'--primary-foreground': '#ffffff',
			'--primary-container': '#e0f2fe',
			'--on-primary-container': '#0c4a6e',
		},
	},
});

/**
 * A host axis for the corners of controls and containers: the radius tokens Radiant UI (`--radius-control`,
 * `--radius-button`, `--radius-container`) and a shadcn theme (`--radius`) read.
 *
 * @remarks
 * `rounded` sets nothing, so it is the radius the host theme already has. `pill` rounds past half the height of a
 * single-line control, so inputs, selects and buttons are fully round. It is a length, not `9999px`, because the card
 * shell of both renderers reads `--radius-control` as well, and a radius that large would turn a card into an ellipse.
 */
export const shape = defineAxis({
	$type: 'shape',
	metadata: { name: 'Shape', description: 'Corner radius of controls and containers' },
	default: 'rounded',
	values: {
		sharp: {
			'--radius-control': '0',
			'--radius-button': '0',
			'--radius-container': '0',
			'--radius': '0',
		},
		rounded: {},
		pill: {
			'--radius-control': '1.25rem',
			'--radius-button': '1.25rem',
			'--radius-container': '1.5rem',
			'--radius': '1.25rem',
		},
	},
});

/**
 * A host axis for the typeface: the font roles Radiant UI (`--font-sans`, `--font-heading`) reads.
 *
 * @remarks
 * Only system stacks, so a pick downloads nothing. A stylesheet decides where the role is read: `themed.css` sets the
 * `font-family` of the form from `--font-sans`. `sans` sets nothing, so it is the typeface the host theme already has.
 */
export const font = defineAxis({
	$type: 'font',
	metadata: { name: 'Font', description: 'Typeface of a form' },
	default: 'sans',
	values: {
		sans: {},
		serif: {
			'--font-sans': "ui-serif, Georgia, Cambria, 'Times New Roman', Times, serif",
			'--font-heading': "ui-serif, Georgia, Cambria, 'Times New Roman', Times, serif",
		},
		mono: {
			'--font-sans': "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', monospace",
			'--font-heading': "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', monospace",
		},
	},
});

/**
 * The compiled theme: the built-in `size` and `surface` axes plus `tone`, `shape` and `font`. Pass it to every engine
 * as `layout`.
 */
export const theme = createLayoutTheme({ appearance: [...builtInAxes, tone, shape, font] });

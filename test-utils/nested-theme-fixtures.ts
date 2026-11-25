/**
 * Config and theme fixtures for the nested theme acceptance tests.
 *
 * @remarks
 * Kept apart from the assertions in `nested-theme-acceptance.ts` because the Node-side global setup
 * renders the guest forms, and importing `vitest`'s `expect` there throws outside a test worker.
 */
import { builtInAxes, createLayoutTheme, defineAxis, type LayoutInput } from '@schema-engine/layout';

/** Where the `tone` values of each theme point, so a wrong theme or a wrong value shows as another color. */
export const ACCENTS = {
	host: { brand: 'red', muted: 'orange' },
	guest: { brand: 'blue', muted: 'purple' },
} as const;

/** The class the author's own stylesheet uses to set the accent token. */
export const NESTED_AUTHOR_CLASS = 'author-accent';
export const AUTHOR_ACCENT = 'green';

function toneAxis(accents: { brand: string; muted: string }) {
	return defineAxis({
		$type: 'tone',
		metadata: { name: 'Tone' },
		default: 'neutral',
		values: { neutral: {}, brand: { '--se-accent': accents.brand }, muted: { '--se-accent': accents.muted } },
	});
}

/** The page's own theme, whose `tone: brand` accent is red and `tone: muted` accent is orange. */
export const nestedHostTheme = createLayoutTheme({ appearance: [...builtInAxes, toneAxis(ACCENTS.host)] });

/**
 * Layout input of the embedded form's theme, whose `tone: brand` accent is blue and `tone: muted` accent is purple.
 *
 * @remarks
 * Its `md` breakpoint is wider than the host's, so between the two widths the host's `md` slot
 * applies and the guest's does not.
 */
export const nestedGuestLayout = {
	grid: { breakpoints: { md: '60rem' } },
	appearance: [...builtInAxes, toneAxis(ACCENTS.guest)],
} satisfies LayoutInput;

/** Which variant of the embedded form {@link nestedThemeForm} authors. */
export interface NestedThemeFormOptions {
	/**
	 * Puts {@link NESTED_AUTHOR_CLASS} on the `step` (which carries a pick but no theme) or on the `form`
	 * (the element that carries the theme and a pick together).
	 */
	authorClass?: 'step' | 'form';
	/** Leaves the form and its step with no pick of their own, so only an outer pick can reach them. */
	unpicked?: boolean;
}

/**
 * Config of the embedded form, authored once for both renderers.
 *
 * @param type The `$type` of the renderer's fixture input.
 * @remarks
 * The form picks `tone: brand` and its step picks `tone: muted`, so the form element carries the
 * theme and a pick on one element, and the step carries a different pick of its own but no theme.
 * The field host below it carries the theme and inherits the step's pick.
 */
export function nestedThemeForm(type: string, options: NestedThemeFormOptions = {}) {
	const picks = !options.unpicked;
	return {
		id: 'nested-theme-acceptance',
		title: 'Nested theme acceptance',
		...(picks ? { appearance: { tone: 'brand' } } : {}),
		className: options.authorClass === 'form' ? NESTED_AUTHOR_CLASS : undefined,
		steps: [
			{
				id: 'main',
				title: 'Main',
				...(picks ? { appearance: { tone: 'muted' } } : {}),
				className: options.authorClass === 'step' ? NESTED_AUTHOR_CLASS : undefined,
				elements: [{ $type: type, id: 'nested', name: 'nested', label: 'Nested field' }],
			},
		],
	};
}

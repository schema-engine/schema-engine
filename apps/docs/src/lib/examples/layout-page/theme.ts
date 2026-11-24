import { createLayoutTheme } from '@schema-engine/layout';

/**
 * The vocabulary of the page: where the grid changes and how far its cells are apart.
 *
 * @remarks
 * The theme has one id and one stylesheet, `theme.css`. Add the stylesheet to the page once: its rules are scoped by
 * `[data-se-theme="<id>"]`, so they apply only to what carries the id.
 */
export const theme = createLayoutTheme({
	grid: { breakpoints: { sm: '20rem', md: '30rem', lg: '40rem' }, gap: { default: '1.25rem' } },
});

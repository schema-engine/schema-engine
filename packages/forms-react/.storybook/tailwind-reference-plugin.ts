import type { Plugin } from 'vite';
import path from 'node:path';

/**
 * Vite plugin that adds @reference to global.css for Tailwind v4 @apply support.
 *
 * In Tailwind v4, CSS files using @apply need to reference the main CSS file
 * containing @theme definitions via the @reference directive.
 */
export function tailwindReferencePlugin({ globalCssPath }: { globalCssPath: string }): Plugin {
	return {
		name: 'tailwind-reference',
		enforce: 'pre',

		transform(code, id) {
			if (!id.endsWith('.css')) return null;

			if (id.includes('global.css')) return null;

			if (id.includes('node_modules')) return null;

			if (code.includes('@reference') || code.includes("@import 'tailwindcss'")) return null;

			if (!code.includes('@apply') && !code.includes('@screen')) return null;

			const cssFileDir = path.dirname(id);
			const relativePath = path.relative(cssFileDir, globalCssPath);

			const referenceStatement = `@reference "${relativePath}";\n\n`;

			return {
				code: referenceStatement + code,
				map: null,
			};
		},
	};
}

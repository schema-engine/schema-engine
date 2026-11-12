import { renderHydrationHtml } from './render-hydration-html';
import type { TestProject } from 'vitest/node';
import {
	getSsrAcceptanceEngine,
	renderSsrLayoutAcceptanceHtml,
	renderSsrWidthsAcceptanceHtml,
} from './render-form-ssr-html';
import { renderSsrNestedWidthsAcceptanceHtml } from './render-nested-widths-ssr-html';
import { renderArrayObjectDefaultsHtml, renderArraySsrAcceptanceHtml } from './render-form-array-ssr-html';

declare module 'vitest' {
	interface ProvidedContext {
		ssrLayoutHtml: string;
		ssrWidthsHtml: string;
		ssrNestedWidthsHtml: string;
		ssrHydrationHtml: string;
		ssrLayoutCompiled: { theme: { id: string }; css: string };
		ssrArrayHtml: string;
		ssrMinItemsHtml: string;
		ssrObjectArrayDefaultsHtml: string;
	}
}

/**
 * Renders the SSR acceptance document in Node and hands it to the browser project.
 *
 * @remarks
 * Radiant's server renderer needs `node:async_hooks`, so it cannot run inside
 * the browser test. Rendering here keeps the browser assertions pointed at the
 * renderer's real output instead of markup the test rebuilt itself.
 */
export default function setup(project: TestProject): void {
	const { theme, css } = getSsrAcceptanceEngine().getCompiledGrid();
	project.provide('ssrHydrationHtml', Buffer.from(renderHydrationHtml()).toString('base64'));
	project.provide('ssrLayoutHtml', renderSsrLayoutAcceptanceHtml());
	project.provide('ssrWidthsHtml', renderSsrWidthsAcceptanceHtml());
	project.provide(
		'ssrNestedWidthsHtml',
		renderSsrNestedWidthsAcceptanceHtml().replaceAll('</script>', '<\\/script>'),
	);
	project.provide('ssrLayoutCompiled', { theme: { id: theme.id }, css });
	const arrayHtml = renderArraySsrAcceptanceHtml().replaceAll('</script>', '<\\/script>');
	project.provide('ssrArrayHtml', arrayHtml);
	const minItemsHtml = renderArraySsrAcceptanceHtml({ contacts: [] }).replaceAll('</script>', '<\\/script>');
	project.provide('ssrMinItemsHtml', minItemsHtml);
	project.provide(
		'ssrObjectArrayDefaultsHtml',
		renderArrayObjectDefaultsHtml().replaceAll('</script>', '<\\/script>'),
	);
}

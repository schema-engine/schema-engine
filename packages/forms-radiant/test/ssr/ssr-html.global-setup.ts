import type { TestProject } from 'vitest/node';
import { getSsrAcceptanceEngine, renderSsrLayoutAcceptanceHtml } from './render-form-ssr-html';

declare module 'vitest' {
	interface ProvidedContext {
		ssrLayoutHtml: string;
		ssrLayoutCompiled: { theme: { id: string }; css: string };
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
	project.provide('ssrLayoutHtml', renderSsrLayoutAcceptanceHtml());
	project.provide('ssrLayoutCompiled', { theme: { id: theme.id }, css });
}

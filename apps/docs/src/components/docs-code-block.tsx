import { eco } from '@ecopages/core';
import type { JsxRenderable } from '@ecopages/jsx';
import { unsafeHtml } from '@ecopages/jsx/jsx-runtime';
import { codeToHtmlSync, type SyncHighlightLanguage } from '@/lib/sync-highlighter';

/**
 * Docs code block with Shiki highlighting.
 *
 * @remarks
 * Rendering must stay synchronous: the ECO JSX renderer invokes component
 * functions while building the JSX tree, so an async render would serialize as
 * `[object Promise]` in the emitted HTML. Language support matches the shared
 * synchronous highlighter.
 */
export const DocsCodeBlock = eco.component<{ code: string; language?: SyncHighlightLanguage }, JsxRenderable>({
	render: ({ code, language = 'ts' }) => (
		<figure data-rehype-pretty-code-figure="">{unsafeHtml(codeToHtmlSync(code, language))}</figure>
	),
});

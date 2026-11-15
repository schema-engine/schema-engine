import { eco } from '@ecopages/core';
import type { JsxRenderable } from '@ecopages/jsx';
import { unsafeHtml } from '@ecopages/jsx/jsx-runtime';
import { highlightToHtml } from '@/lib/pierre-highlight';

/**
 * Docs code block highlighted with Pierre.
 *
 * @remarks
 * Rendering must stay synchronous: the ECO JSX renderer invokes component
 * functions while building the JSX tree, so an async render would serialize as
 * `[object Promise]` in the emitted HTML. Pierre's tokenizer is synchronous, and a
 * language it has no grammar for renders as plain text.
 */
export const DocsCodeBlock = eco.component<{ code: string; language?: string }, JsxRenderable>({
	render: ({ code, language = 'ts' }) => (
		<figure data-rehype-pretty-code-figure="">{unsafeHtml(highlightToHtml(code, language))}</figure>
	),
});

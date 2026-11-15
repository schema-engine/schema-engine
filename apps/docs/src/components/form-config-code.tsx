import { eco } from '@ecopages/core';
import type { JsxRenderable } from '@ecopages/jsx';
import { unsafeHtml } from '@ecopages/jsx/jsx-runtime';
import type { FormConfig } from '@schema-engine/forms/schemas';
import { formConfigToCode } from '@/lib/form-config-code';
import { highlightToHtml } from '@/lib/pierre-highlight';

/**
 * Renders a form configuration snippet from the same object the live demo
 * consumes, so documented examples cannot drift from the interactive demos.
 *
 * @remarks
 * Shares the synchronous Pierre highlighter with the docs code blocks; MDX cannot
 * await async components.
 */
export const FormConfigCode = eco.component<{ config: FormConfig; rootName?: string }, JsxRenderable>({
	render: ({ config, rootName = 'formConfig' }) => (
		<figure data-rehype-pretty-code-figure="">
			{unsafeHtml(highlightToHtml(formConfigToCode(config, rootName), 'ts'))}
		</figure>
	),
});

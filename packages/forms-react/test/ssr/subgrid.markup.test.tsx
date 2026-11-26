import { describe, expect, test } from 'vitest';
import { expectSubgridMarkup } from '../../../../test-utils/ssr-grid-acceptance';
import { SSR_CONTAINER_LAYOUT } from '../../../../test-utils/ssr-grid-fixtures';
import { renderSsrNestedGridsHtml, renderSsrSubgridHtml } from './render-form-ssr-html';

describe('subgrid markup in React', () => {
	test('the item, the fieldset and the inner grid carry the subgrid class, with no query container inside', () => {
		const html = renderSsrSubgridHtml('widths');
		expectSubgridMarkup(html, false);
		const boxes = Array.from(
			html.matchAll(/<(div|fieldset)[^>]*class="([^"]*\bse-subgrid\b[^"]*)"/g),
			(match) => match[1],
		);
		expect(boxes).toEqual(['div', 'fieldset', 'div']);
	});

	test('in container mode only the step grid is wrapped', () => {
		expectSubgridMarkup(renderSsrSubgridHtml('container'), true);
	});

	test('a form that sets no subgrid renders no subgrid class, in either query mode', () => {
		const markup = (html: string) => html.replace(/<style[\s\S]*?<\/style>/g, '');
		expect(markup(renderSsrNestedGridsHtml().html)).not.toContain('se-subgrid');
		expect(markup(renderSsrNestedGridsHtml().html)).toContain('<fieldset class="border-0 p-0 m-0">');
		expect(markup(renderSsrNestedGridsHtml(SSR_CONTAINER_LAYOUT).html)).not.toContain('se-subgrid');
	});
});

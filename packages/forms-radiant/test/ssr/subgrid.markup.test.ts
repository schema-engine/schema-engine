import { describe, expect, test } from 'vitest';
import { expectSubgridMarkup } from '../../../../test-utils/ssr-grid-acceptance';
import { renderSsrSubgridHtml } from './render-subgrid-ssr-html';
import { renderSsrNestedWidthsAcceptanceHtml } from './render-nested-widths-ssr-html';

const withoutStyle = (html: string) => html.replace(/<style[\s\S]*?<\/style>/g, '');

describe('subgrid markup in Radiant', () => {
	test('the item, its fieldset and the inner grid carry the subgrid class, with no query container inside', () => {
		const html = renderSsrSubgridHtml('widths');
		expectSubgridMarkup(html, false);
		const boxes = Array.from(
			withoutStyle(html).matchAll(/<(div|fieldset)[^>]*class="([^"]*\bse-subgrid\b[^"]*)"/g),
			(match) => match[1],
		);
		expect(boxes).toEqual(['div', 'fieldset', 'div']);
	});

	test('the item carries the fieldset look and the fieldset inside it draws none', () => {
		const markup = withoutStyle(renderSsrSubgridHtml('widths'));
		expect(markup).toMatch(/<div[^>]*class="se-form-field se-grid-item se-subgrid se-fieldset"/);
		expect(markup).toMatch(/<fieldset[^>]*class="se-subgrid"/);
	});

	test('in container mode only the step grid is wrapped', () => {
		expectSubgridMarkup(renderSsrSubgridHtml('container'), true);
	});

	test('a fieldset that is not a subgrid is the fieldset it was', () => {
		const markup = withoutStyle(renderSsrNestedWidthsAcceptanceHtml());
		expect(markup).not.toContain('se-subgrid');
		expect(markup).toMatch(/<fieldset[^>]*class="se-form-field se-grid-item se-fieldset"/);
	});
});

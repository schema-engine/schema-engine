import { describe, expect, test } from 'vitest';
import { expectSubgridMarkup } from '../../../../test-utils/ssr-grid-acceptance';
import { renderSsrSubgridHtml } from './render-subgrid-ssr-html';
import { renderSsrNestedWidthsAcceptanceHtml } from './render-nested-widths-ssr-html';

const withoutStyle = (html: string) => html.replace(/<style[\s\S]*?<\/style>/g, '');

describe('subgrid markup in Radiant', () => {
	test('the item and the inner grid carry the subgrid class, with no fieldset or query container between them', () => {
		const html = withoutStyle(renderSsrSubgridHtml('widths'));
		expectSubgridMarkup(html, false);
		const boxes = Array.from(html.matchAll(/<(\w+)[^>]*class="([^"]*\bse-subgrid\b[^"]*)"/g), (match) => match[1]);
		expect(boxes).toEqual(['div', 'div']);
		expect(html).not.toContain('<fieldset');
	});

	test('the item is a group with the fieldset look, labelled by its legend', () => {
		const markup = withoutStyle(renderSsrSubgridHtml('widths'));
		const item =
			markup.match(/<div[^>]*class="se-form-field se-grid-item se-subgrid se-fieldset"[^>]*>/)?.[0] ?? '';
		expect(item).toContain('role="group"');
		const labelledBy = item.match(/aria-labelledby="([^"]+)"/)?.[1];
		expect(labelledBy).toBeTruthy();
		expect(markup).toContain(`<div class="se-fieldset__legend" id="${labelledBy}">Address</div>`);
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

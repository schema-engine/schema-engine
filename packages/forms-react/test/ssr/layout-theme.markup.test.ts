import { createLayoutTheme } from '@schema-engine/layout';
import { describe, expect, test } from 'vitest';
import { expectOneThemeOneStylesheet, expectSharedLayoutTheme } from '../../../../test-utils/ssr-grid-acceptance';
import { renderSsrFormsOnOnePage } from './render-form-ssr-html';
import { createSsrAcceptanceEngine } from './ssr-fixture';

describe('the layout theme in React markup', () => {
	test('a form carries one data-se-theme and one stylesheet for the grid and the appearance rules', () => {
		const engine = createSsrAcceptanceEngine({
			grid: { minColumnWidth: '12rem' },
			appearance: { tone: { brand: { '--se-tone-accent': '#f60' } } },
		});
		const html = renderSsrFormsOnOnePage([engine]);

		expectOneThemeOneStylesheet(html, engine.getLayout());
		expect(html).toContain('--se-tone-accent:#f60');
	});

	test('two engines on one compiled theme carry the same data-se-theme and share one stylesheet', () => {
		const theme = createLayoutTheme({ appearance: { tone: ['neutral', 'brand'] } });
		const first = createSsrAcceptanceEngine(theme);
		const second = createSsrAcceptanceEngine(theme);
		const page = renderSsrFormsOnOnePage([first, second]);

		expect(first.getLayout()).toBe(second.getLayout());
		expectSharedLayoutTheme(page, theme, true);
	});

	test('engines on different themes keep separate ids and stylesheets', () => {
		const first = createSsrAcceptanceEngine({ appearance: { tone: ['a'] } });
		const second = createSsrAcceptanceEngine({ appearance: { tone: ['b'] } });
		const page = renderSsrFormsOnOnePage([first, second]);

		expect(first.getLayout().id).not.toBe(second.getLayout().id);
		expect(page).toContain(`data-se-theme="${first.getLayout().id}"`);
		expect(page).toContain(`data-se-theme="${second.getLayout().id}"`);
		expect(page).toContain(`se-layout-theme-${first.getLayout().id}`);
		expect(page).toContain(`se-layout-theme-${second.getLayout().id}`);
		expect(page).toContain(first.getLayout().css);
		expect(page).toContain(second.getLayout().css);
	});
});

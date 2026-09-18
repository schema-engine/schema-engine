import { describe, expect, test } from 'vitest';
import { getSsrAcceptanceEngine, renderSsrLayoutAcceptanceHtml } from './render-form-ssr-html';

describe('SSR grid layout markup', () => {
	test('emits the compiled stylesheet and cascaded field variables', () => {
		const html = renderSsrLayoutAcceptanceHtml();
		const compiled = getSsrAcceptanceEngine().getCompiledGrid();
		expect(html).not.toMatch(/<script\b/i);
		expect(html).toContain(compiled.css.slice(0, 48));
		expect(html).toContain(`data-se-grid-theme="${compiled.theme.id}"`);
		expect(html).toContain('se-form-grid');
		expect(html).toContain('se-form-field');
		expect(html).toContain('--se-field-grid-column-lg:span 2');
		expect(html).toContain('--se-field-display-lg:none');
	});
});

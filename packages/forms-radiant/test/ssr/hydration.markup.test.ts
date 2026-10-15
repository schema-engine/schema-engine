import { expect, test } from 'vitest';
import { renderHydrationHtml } from './render-hydration-html';

test('every field family serializes the engine rules for hydration', () => {
	const html = renderHydrationHtml();
	expect(html.match(/<se-field[^>]*data-se-validation-rules=/g)).toHaveLength(4);
	expect(html).not.toContain('data-se-field-rules');
});

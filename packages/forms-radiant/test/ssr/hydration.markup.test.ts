import { expect, test } from 'vitest';
import { renderHydrationHtml } from './render-hydration-html';

test('every field family serializes the engine rules for hydration', () => {
	const html = renderHydrationHtml();
	expect(html.match(/<se-field[^>]*data-se-validation-rules=/g)).toHaveLength(6);
	expect(html).not.toContain('data-se-field-rules');
});

test.each([
	['contact', 'email'],
	['phone', 'phone'],
])('%s serializes the %s rule its registration attaches by default', (name, type) => {
	const field = renderHydrationHtml()
		.split('<se-field')
		.find((markup) => markup.includes(`name="${name}"`));
	expect(field?.split('>')[0]).toContain(`data-se-validation-rules="[{&quot;type&quot;:&quot;${type}&quot;}]"`);
});

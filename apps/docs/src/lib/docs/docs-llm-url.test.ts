import { expect, test } from 'vitest';
import { getDocsLlmUrl, getDocsLlmUrlFromPathname } from '@/lib/docs/docs-llm-url';

test('getDocsLlmUrlFromPathname maps docs paths to docs-llm markdown URLs', () => {
	expect(getDocsLlmUrlFromPathname('/docs/forms/builder')).toBe('/docs-llm/forms/builder.md');
	expect(getDocsLlmUrlFromPathname('/docs/forms/builder/')).toBe('/docs-llm/forms/builder.md');
	expect(getDocsLlmUrlFromPathname('/docs/reference/nested/deep-page')).toBe('/docs-llm/reference/deep-page.md');
});

test('getDocsLlmUrlFromPathname returns null for non-docs paths', () => {
	expect(getDocsLlmUrlFromPathname('/')).toBeNull();
	expect(getDocsLlmUrlFromPathname('/docs')).toBeNull();
	expect(getDocsLlmUrlFromPathname('/docs/forms')).toBeNull();
	expect(getDocsLlmUrlFromPathname('/about/forms/builder')).toBeNull();
});

test('getDocsLlmUrl matches the path the generator writes', () => {
	expect(getDocsLlmUrl('schema-engine', 'introduction')).toBe('/docs-llm/schema-engine/introduction.md');
});

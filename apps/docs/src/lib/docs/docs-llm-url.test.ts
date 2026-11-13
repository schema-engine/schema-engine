import { expect, test } from 'vitest';
import { getDocsLlmUrl, getDocsLlmUrlFromPathname } from '@/lib/docs/docs-llm-url';

test('getDocsLlmUrlFromPathname maps docs paths to llms-content URLs', () => {
	expect(getDocsLlmUrlFromPathname('/docs/forms/builder')).toBe('/llms-content/forms/builder.txt');
	expect(getDocsLlmUrlFromPathname('/docs/forms/builder/')).toBe('/llms-content/forms/builder.txt');
	expect(getDocsLlmUrlFromPathname('/docs/reference/nested/deep-page')).toBe(
		'/llms-content/reference/nested/deep-page.txt',
	);
});

test('getDocsLlmUrlFromPathname returns null for non-docs paths', () => {
	expect(getDocsLlmUrlFromPathname('/')).toBeNull();
	expect(getDocsLlmUrlFromPathname('/docs')).toBeNull();
	expect(getDocsLlmUrlFromPathname('/about/forms')).toBeNull();
});

test('getDocsLlmUrl matches the path the generator writes', () => {
	expect(getDocsLlmUrl('getting-started/introduction')).toBe('/llms-content/getting-started/introduction.txt');
});

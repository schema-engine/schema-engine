import { expect, test } from 'vitest';
import {
	DEFAULT_OG_IMAGE_PATH,
	SITE_GITHUB,
	SITE_NAME,
	absoluteImageUrl,
	absoluteUrl,
	docsPageHeadLinks,
	homepageSoftwareApplicationJsonLd,
	normalizeSiteOrigin,
	ogTypeForPathname,
} from './site-meta';

const origin = 'http://localhost:3000';

test('absoluteUrl normalizes origin and pathname', () => {
	expect(absoluteUrl('/', origin)).toBe('http://localhost:3000/');
	expect(absoluteUrl('/docs/schema-engine/introduction', origin)).toBe(
		'http://localhost:3000/docs/schema-engine/introduction',
	);
	expect(absoluteUrl('docs/schema-engine/introduction', `${origin}/`)).toBe(
		'http://localhost:3000/docs/schema-engine/introduction',
	);
	expect(absoluteUrl('/docs/schema-engine/introduction')).toMatch(/\/docs\/schema-engine\/introduction$/);
	expect(normalizeSiteOrigin(`${origin}/`)).toBe(origin);
});

test('absoluteImageUrl strips public/ and falls back to the default OG path', () => {
	expect(absoluteImageUrl(undefined, origin)).toBe(`http://localhost:3000${DEFAULT_OG_IMAGE_PATH}`);
	expect(absoluteImageUrl('public/assets/images/default-og.png', origin)).toBe(
		`http://localhost:3000${DEFAULT_OG_IMAGE_PATH}`,
	);
	expect(absoluteImageUrl('/assets/images/default-og.png', origin)).toBe(
		`http://localhost:3000${DEFAULT_OG_IMAGE_PATH}`,
	);
	expect(absoluteImageUrl('https://your-domain.com/og-image.png', origin)).toBe(
		'https://your-domain.com/og-image.png',
	);
	expect(absoluteImageUrl('http://cdn.example.com/share.png', origin)).toBe('http://cdn.example.com/share.png');
});

test('ogTypeForPathname uses website on home and article on docs', () => {
	expect(ogTypeForPathname(undefined)).toBe('website');
	expect(ogTypeForPathname('/')).toBe('website');
	expect(ogTypeForPathname('/docs/schema-engine/introduction')).toBe('article');
});

test('homepageSoftwareApplicationJsonLd names GitHub as sameAs', () => {
	const jsonLd = homepageSoftwareApplicationJsonLd('Schema-driven forms.', origin);
	expect(jsonLd['@type']).toBe('SoftwareApplication');
	expect(jsonLd.name).toBe(SITE_NAME);
	expect(jsonLd.url).toBe('http://localhost:3000/');
	expect(jsonLd.sameAs).toEqual([SITE_GITHUB]);
});

test('docsPageHeadLinks emits canonical and markdown alternate URLs', () => {
	expect(docsPageHeadLinks(undefined, origin)).toEqual({ canonical: null, markdownAlternate: null });
	expect(docsPageHeadLinks('/', origin)).toEqual({
		canonical: 'http://localhost:3000/',
		markdownAlternate: null,
	});
	expect(docsPageHeadLinks('/docs/schema-engine/introduction', origin)).toEqual({
		canonical: 'http://localhost:3000/docs/schema-engine/introduction',
		markdownAlternate: 'http://localhost:3000/docs-llm/schema-engine/introduction.md',
	});
});

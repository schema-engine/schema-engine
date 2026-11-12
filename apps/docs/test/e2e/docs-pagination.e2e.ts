import { expect, inject, test } from 'vitest';
import { chromium } from 'playwright';

const baseUrl = inject('docsBaseUrl');
const pagePath = '/docs/forms-react/layouts';

test('pagination links are in the server HTML and follow client navigation', async () => {
	const html = await (await fetch(`${baseUrl}${pagePath}`)).text();
	expect(html).toContain('class="docs-layout__pagination"');
	expect(html).not.toContain('docs-pagination-data');

	const browser = await chromium.launch();
	try {
		const page = await browser.newPage();
		await page.goto(`${baseUrl}${pagePath}`, { waitUntil: 'networkidle' });
		const next = page.locator('.docs-layout__pagination a.next');
		const nextHref = await next.getAttribute('href');
		expect(nextHref).toBeTruthy();

		await next.click();
		await page.waitForURL(`**${nextHref}`);
		await page.waitForFunction(
			(href) => document.querySelector('.docs-layout__pagination a.prev')?.getAttribute('href') !== href,
			nextHref,
		);
		expect(await page.locator('.docs-layout__pagination a.prev').getAttribute('href')).toBe(pagePath);
	} finally {
		await browser.close();
	}
});

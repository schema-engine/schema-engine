import { expect, inject, test } from 'vitest';
import { chromium } from 'playwright';

const baseUrl = inject('docsBaseUrl');
const pagePath = '/docs/forms/builder';

test('built docs HTML carries SEO links, heading ids and copy buttons', async () => {
	const html = await (await fetch(`${baseUrl}${pagePath}`)).text();

	expect(html).toMatch(/<link rel="canonical" href="https?:\/\/[^"]+\/docs\/forms\/builder">/);
	expect(html).toContain('rel="alternate" type="text/markdown"');
	expect(html).toContain('/docs-llm/forms/builder.md');
	expect(html).toContain('property="og:image"');
	expect(html).toMatch(/<h2 id="[a-z0-9-]+"/);
	expect(html).toContain('data-rehype-pretty-copy=');
});

test('sitemap lists docs pages and the llms index', async () => {
	const sitemap = await (await fetch(`${baseUrl}/sitemap.xml`)).text();

	expect(sitemap).toContain('/docs/forms/builder');
	expect(sitemap).toContain('/llms.txt');
});

test('a fenced code block copies its source, announces the result and a blank line keeps its height', async () => {
	const browser = await chromium.launch();
	try {
		const context = await browser.newContext();
		await context.grantPermissions(['clipboard-read', 'clipboard-write']);
		const page = await context.newPage();
		await page.goto(`${baseUrl}${pagePath}`, { waitUntil: 'networkidle' });

		const button = page.locator('figure[data-rehype-pretty-code-figure] > [data-rehype-pretty-copy]').first();
		const expected = await button.getAttribute('data-rehype-pretty-copy');
		expect(expected).toBeTruthy();
		expect(await button.evaluate((el) => el.closest('pre') === null)).toBe(true);

		await button.focus();
		await button.click();
		await page.waitForFunction(
			() => document.querySelector('[data-code-copy-status]')?.textContent === 'Code copied to clipboard',
		);
		expect(await button.getAttribute('aria-label')).toBe('Copy code');
		expect(await button.textContent()).toBe('Copied');
		expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(expected);

		const emptyLineHeights = await page
			.locator('figure[data-rehype-pretty-code-figure] pre > code > [data-line]')
			.evaluateAll((lines) =>
				lines
					.filter((line) => line.textContent?.trim() === '')
					.map((line) => line.getBoundingClientRect().height),
			);
		expect(emptyLineHeights.length).toBeGreaterThan(0);
		for (const height of emptyLineHeights) {
			expect(height).toBeGreaterThan(0);
		}
	} finally {
		await browser.close();
	}
});

test('the built docs shell defines the Radiant UI and docs custom elements it renders', async () => {
	const browser = await chromium.launch();
	try {
		const page = await browser.newPage();
		await page.goto(`${baseUrl}/docs/styling/recipes`, { waitUntil: 'networkidle' });

		const undefinedTags = await page.evaluate(() =>
			[
				'rui-toc',
				'rui-sidebar',
				'rui-breadcrumb',
				'rui-tabs',
				'radiant-code-tabs',
				'radiant-copy-for-llm',
			].filter((tag) => document.querySelector(tag) !== null && customElements.get(tag) === undefined),
		);
		expect(undefinedTags).toEqual([]);

		const rendered = await page.evaluate(() =>
			['rui-toc', 'rui-sidebar', 'rui-tabs'].filter((tag) => document.querySelector(tag) === null),
		);
		expect(rendered).toEqual([]);
	} finally {
		await browser.close();
	}
});

test('a heading fragment link lands on its heading', async () => {
	const browser = await chromium.launch();
	try {
		const page = await browser.newPage();
		const html = await (await fetch(`${baseUrl}${pagePath}`)).text();
		const id = /<h2 id="([^"]+)"/.exec(html)?.[1] ?? '';
		expect(id).toBeTruthy();

		await page.goto(`${baseUrl}${pagePath}#${id}`, { waitUntil: 'networkidle' });
		expect(await page.evaluate((target) => document.getElementById(target) !== null, id)).toBe(true);
	} finally {
		await browser.close();
	}
});

test('Copy for LLM renders on the server and copies the page Markdown export', async () => {
	const html = await (await fetch(`${baseUrl}${pagePath}`)).text();
	expect(html).toContain('<radiant-copy-for-llm llm-url="/docs-llm/forms/builder.md"');

	const markdown = await fetch(`${baseUrl}/docs-llm/forms/builder.md`);
	expect(markdown.status).toBe(200);
	const expected = await markdown.text();

	const browser = await chromium.launch();
	try {
		const context = await browser.newContext();
		await context.grantPermissions(['clipboard-read', 'clipboard-write']);
		const page = await context.newPage();
		await page.goto(`${baseUrl}${pagePath}`, { waitUntil: 'networkidle' });

		const button = page.getByTestId('copy-for-llm');
		expect(await button.textContent()).toContain('Copy for LLM');
		await button.click();
		await page.waitForFunction(
			() => document.querySelector('.docs-copy-for-llm__status')?.textContent === 'Page copied for LLM',
		);
		expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(expected);
	} finally {
		await browser.close();
	}
});

test('the previous llms-content exports still answer for one release', async () => {
	const legacy = await fetch(`${baseUrl}/llms-content/forms/builder.txt`);
	expect(legacy.status).toBe(200);
	expect(await legacy.text()).toBe(await (await fetch(`${baseUrl}/docs-llm/forms/builder.md`)).text());
});

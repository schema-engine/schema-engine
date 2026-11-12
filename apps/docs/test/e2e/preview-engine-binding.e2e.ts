import { expect, inject, test } from 'vitest';
import { chromium } from 'playwright';

const baseUrl = inject('docsBaseUrl');

test('previews bind the engine on load and after client navigation without engine warnings or blanking', async () => {
	const browser = await chromium.launch();
	try {
		const page = await browser.newPage();
		const messages: string[] = [];
		page.on('console', (message) => {
			if (['warning', 'error'].includes(message.type())) messages.push(message.text());
		});
		await page.addInitScript(() => {
			Reflect.set(window, '__blankedPreview', false);
			new MutationObserver(() => {
				const preview = document.querySelector('.docs-form-renderer-preview');
				if (preview && !preview.hasChildNodes()) Reflect.set(window, '__blankedPreview', true);
			}).observe(document, { childList: true, subtree: true });
		});

		await page.goto(`${baseUrl}/docs/forms-radiant/getting-started`, { waitUntil: 'networkidle' });
		await page.waitForFunction(() => customElements.get('se-form-renderer') !== undefined);
		expect(await page.locator('.docs-form-renderer-preview rui-form').count()).toBeGreaterThan(0);

		await page.locator('a[href="/docs/forms-radiant/layouts"]').first().click();
		await page.waitForURL('**/docs/forms-radiant/layouts');
		await page.locator('.docs-form-renderer-preview rui-form').first().waitFor();

		expect(await page.evaluate(() => Reflect.get(window, '__blankedPreview'))).toBe(false);
		expect(messages.filter((text) => /engine|@ecopages\/radiant|upgrade/i.test(text))).toEqual([]);
	} finally {
		await browser.close();
	}
});

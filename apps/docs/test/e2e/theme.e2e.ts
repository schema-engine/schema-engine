import { expect, inject, test } from 'vitest';
import { chromium } from 'playwright';

const baseUrl = inject('docsBaseUrl');

test('renders resolved theme colors in light and dark modes', async () => {
	const browser = await chromium.launch();
	try {
		const page = await browser.newPage({ colorScheme: 'light' });
		await page.goto(baseUrl, { waitUntil: 'networkidle' });
		const colors = async () =>
			page.evaluate(() => {
				const root = getComputedStyle(document.documentElement);
				return {
					background: root.getPropertyValue('--background').trim(),
					primary: root.getPropertyValue('--primary').trim(),
					text: getComputedStyle(document.body).color,
				};
			});
		const light = await colors();
		await page.emulateMedia({ colorScheme: 'dark' });
		await page.reload({ waitUntil: 'networkidle' });
		const dark = await colors();

		for (const theme of [light, dark]) {
			expect(theme.background).not.toBe('');
			expect(theme.primary).not.toBe('');
		}
		expect(dark.background).not.toBe(light.background);
		expect(dark.text).not.toBe(light.text);
	} finally {
		await browser.close();
	}
});

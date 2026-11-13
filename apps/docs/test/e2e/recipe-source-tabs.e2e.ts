import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, inject, test } from 'vitest';
import { expect as pwExpect } from '@playwright/test';
import { chromium } from 'playwright';

const baseUrl = inject('docsBaseUrl');

test('recipe source tabs preserve whitespace and copy the active file', async () => {
	const browser = await chromium.launch();
	try {
		const context = await browser.newContext({ permissions: ['clipboard-read', 'clipboard-write'] });
		const page = await context.newPage();
		await page.goto(`${baseUrl}/docs/forms-react/layouts`, { waitUntil: 'networkidle' });
		const codeTabs = page.locator('radiant-code-tabs').first();
		const source = codeTabs.locator('.code-tabs__code').first();
		await pwExpect(source).toBeVisible();
		const expected = readFileSync(
			resolve(process.cwd(), '../../registry/shared/forms/recipes/registrations/card.ts'),
			'utf8',
		);
		expect(await source.textContent()).toBe(expected);
		expect(await source.evaluate((element) => getComputedStyle(element).whiteSpace)).toMatch(/^pre/);
		expect(
			await source.evaluate((element) => {
				const styles = getComputedStyle(element);
				return [styles.marginTop, styles.paddingTop, styles.borderTopWidth, styles.fontSize];
			}),
		).toEqual(['0px', '0px', '0px', '13px']);
		expect(await source.locator('code').evaluate((element) => getComputedStyle(element).fontSize)).toBe('13px');
		await codeTabs.locator('.code-tabs__copy').first().click();
		expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(expected);
		let multiTabGroups = 0;
		for (const recipe of await page.locator('radiant-code-tabs').all()) {
			const tabs = recipe.getByRole('tab');
			const count = await tabs.count();
			if (count > 1) multiTabGroups += 1;
			for (let index = 0; index < count; index += 1) {
				const tab = tabs.nth(index);
				await tab.click();
				await pwExpect(tab).toHaveAttribute('aria-selected', 'true');
				const panel = recipe.getByRole('tabpanel').filter({ visible: true });
				expect(await tab.getAttribute('aria-controls')).toBe(await panel.getAttribute('id'));
				const visibleSource = panel.locator('.code-tabs__code');
				await pwExpect(visibleSource).toBeVisible();
				expect(await visibleSource.evaluate((element) => getComputedStyle(element).whiteSpace)).toMatch(/^pre/);
				const content = await visibleSource.textContent();
				await panel.locator('.code-tabs__copy').click();
				expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(content);
			}
		}
		expect(multiTabGroups).toBeGreaterThan(0);
		await context.close();
	} finally {
		await browser.close();
	}
});

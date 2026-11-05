import { expect, inject, test } from 'vitest';
import { expect as pwExpect } from '@playwright/test';
import { chromium } from 'playwright';

const baseUrl = inject('docsBaseUrl');

test('dispatches sequential actions from the overview playground', async () => {
	const browser = await chromium.launch();
	try {
		const page = await browser.newPage({ reducedMotion: 'reduce' });
		await page.goto(`${baseUrl}/docs/actions/overview`, { waitUntil: 'networkidle' });
		const sequential = page.locator('[data-example="sequential"]');
		await pwExpect(sequential).toBeVisible();
		expect(
			await sequential
				.locator('.action-playground__code code')
				.evaluate((el) => getComputedStyle(el).backgroundColor),
		).toMatch(/^(transparent|rgba\(\s*0,\s*0,\s*0,\s*0\))$/);
		await pwExpect(page.locator('[data-example="parallel"]')).toBeVisible();
		await pwExpect(page.locator('[data-example="short-circuit"]')).toBeVisible();
		await sequential.locator('.action-playground__control').click();
		await pwExpect(sequential.locator('[data-node-id="serialize"]')).toHaveAttribute('data-status', 'running');
		await pwExpect(sequential.locator('[data-node-id="result"] .rui-spinner')).toBeVisible();
		expect(
			await sequential
				.locator('[data-node-id="result"] .rui-spinner')
				.evaluate((el) => getComputedStyle(el).animationName),
		).toBe('none');
		await pwExpect(sequential.locator('[data-node-id="result"]')).toHaveAttribute('data-status', 'succeeded', {
			timeout: 15_000,
		});
		await pwExpect(sequential.locator('[data-node-id="index"]')).toHaveAttribute('data-status', 'succeeded');
		await page.goto(`${baseUrl}/docs/forms/actions`, { waitUntil: 'networkidle' });
		expect(await page.locator('.eco-banner a[href="/docs/actions/overview"]').count()).toBe(1);
	} finally {
		await browser.close();
	}
});

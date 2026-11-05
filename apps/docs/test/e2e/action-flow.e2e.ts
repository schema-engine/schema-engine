import { expect, inject, test } from 'vitest';
import { chromium } from 'playwright';

const baseUrl = inject('docsBaseUrl');

test('explains action flow with reduced motion and links the form guide to actions', async () => {
	const browser = await chromium.launch();
	try {
		const page = await browser.newPage({ reducedMotion: 'reduce' });
		await page.goto(`${baseUrl}/docs/actions/overview`, { waitUntil: 'networkidle' });
		const flow = page.locator('[aria-label="Action execution flow"]');
		expect(await flow.isVisible()).toBe(true);
		expect(await flow.innerText()).toContain('Trigger');
		expect(await flow.innerText()).toContain('After each action, the dispatcher decides whether to continue');
		await page.emulateMedia({ reducedMotion: 'no-preference' });
		expect(
			await flow
				.locator('[data-flow-step]')
				.first()
				.evaluate((el) => getComputedStyle(el).animationName),
		).toBe('action-flow-enter');
		await page.emulateMedia({ reducedMotion: 'reduce' });
		expect(
			await flow
				.locator('[data-flow-step]')
				.first()
				.evaluate((el) => getComputedStyle(el).animationName),
		).toBe('none');
		await page.goto(`${baseUrl}/docs/forms/actions`, { waitUntil: 'networkidle' });
		expect(await page.locator('.eco-banner a[href="/docs/actions/overview"]').count()).toBe(1);
	} finally {
		await browser.close();
	}
});

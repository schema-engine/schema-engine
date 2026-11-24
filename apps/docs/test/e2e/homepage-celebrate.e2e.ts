import { expect, inject, test } from 'vitest';
import { expect as pwExpect, type Page } from '@playwright/test';
import { chromium } from 'playwright';

const baseUrl = inject('docsBaseUrl');

const viewport = { width: 1440, height: 900 };
const TOAST = 'Message sent! Thanks for reaching out.';

/** Collects the URLs the page requests for the lazily loaded `canvas-confetti` chunk. */
function watchConfettiRequests(page: Page): string[] {
	const requests: string[] = [];
	page.on('request', (request) => {
		if (request.url().includes('canvas-confetti')) requests.push(request.url());
	});
	return requests;
}

async function submitValidForm(page: Page): Promise<void> {
	const demo = page.locator('.docs-form-renderer-preview');
	await demo.locator('input[name="email"]').fill('test@example.com');
	await demo.locator('textarea[name="message"]').fill('A test message that is long enough');
	await demo.locator('button[type="submit"]').click();
}

test('a valid submit of the homepage form shows a toast and loads the confetti only then', async () => {
	const browser = await chromium.launch();
	try {
		const page = await browser.newPage({ viewport });
		const confettiRequests = watchConfettiRequests(page);
		await page.goto(baseUrl, { waitUntil: 'networkidle' });
		expect(confettiRequests).toEqual([]);

		await submitValidForm(page);
		await pwExpect(page.getByRole('status').getByText(TOAST, { exact: true })).toBeVisible();
		await pwExpect(page.locator('canvas')).toHaveCount(1);
		expect(confettiRequests).toHaveLength(1);
		await pwExpect(page.locator('.docs-form-renderer-preview input[name="email"]')).toHaveValue('');
	} finally {
		await browser.close();
	}
});

test('under reduced motion the homepage form shows the toast and never downloads the confetti', async () => {
	const browser = await chromium.launch();
	try {
		const page = await browser.newPage({ viewport, reducedMotion: 'reduce' });
		const confettiRequests = watchConfettiRequests(page);
		await page.goto(baseUrl, { waitUntil: 'networkidle' });

		await submitValidForm(page);
		await pwExpect(page.getByRole('status').getByText(TOAST, { exact: true })).toBeVisible();
		await pwExpect(page.locator('.docs-form-renderer-preview input[name="email"]')).toHaveValue('');
		await page.waitForLoadState('networkidle');
		expect(confettiRequests).toEqual([]);
		await pwExpect(page.locator('canvas')).toHaveCount(0);
	} finally {
		await browser.close();
	}
});

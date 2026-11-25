import { expect, inject, test } from 'vitest';
import { expect as pwExpect } from '@playwright/test';
import { chromium } from 'playwright';

const baseUrl = inject('docsBaseUrl');

/** Wide enough for the demos of an example to sit side by side, so the Radiant one is not behind a tab. */
const viewport = { width: 1700, height: 900 };

test('the actions of the config run after a submission: send, notify, reset', async () => {
	const browser = await chromium.launch();
	try {
		const page = await browser.newPage({ viewport });
		const pageErrors: string[] = [];
		page.on('pageerror', (error) => pageErrors.push(error.message));
		await page.goto(`${baseUrl}/docs/examples/submit-notify-reset`, { waitUntil: 'networkidle' });
		await page.evaluate(() => {
			const events: string[] = [];
			Reflect.set(window, '__actionEvents', events);
			const fetchOriginal = window.fetch.bind(window);
			window.fetch = async (input, init) => {
				const response = await fetchOriginal(input, init);
				if (input === '/api/subscriptions' && init?.method === 'POST') events.push('submit');
				return response;
			};
			document.addEventListener('schema-engine:docs-action-notification', () => {
				const input = document.querySelector<HTMLInputElement>(
					'.docs-form-renderer-preview input[name="email"]',
				);
				events.push(`notification:${input?.value}`);
			});
		});
		const demo = page.locator('.docs-form-renderer-preview');
		const email = demo.locator('input[name="email"]');
		await email.fill('test@example.com');
		await demo.locator('button[type="submit"]').click();
		await pwExpect(
			page.getByRole('status').getByText('You are subscribed. Look out for the next update.', { exact: true }),
		).toBeVisible();
		await pwExpect(email).toHaveValue('');
		expect(await page.evaluate(() => Reflect.get(window, '__actionEvents'))).toEqual([
			'submit',
			'notification:test@example.com',
		]);
		expect(pageErrors).toEqual([]);
	} finally {
		await browser.close();
	}
});

test('the actions run after navigating within the docs', async () => {
	const browser = await chromium.launch();
	try {
		const page = await browser.newPage({ viewport });
		await page.goto(`${baseUrl}/docs/schema-engine/introduction`, { waitUntil: 'networkidle' });
		await page.evaluate(() => Reflect.set(window, '__docsNavigationProbe', true));
		await page.locator('a[href="/docs/examples/submit-notify-reset"]').first().click();
		await pwExpect(page).toHaveURL(`${baseUrl}/docs/examples/submit-notify-reset`);
		expect(await page.evaluate(() => Reflect.get(window, '__docsNavigationProbe'))).toBe(true);
		const demo = page.locator('.docs-form-renderer-preview');
		const email = demo.locator('input[name="email"]');
		await email.fill('test@example.com');
		await demo.locator('button[type="submit"]').click();
		await pwExpect(
			page.getByRole('status').getByText('You are subscribed. Look out for the next update.', { exact: true }),
		).toBeVisible();
		await pwExpect(email).toHaveValue('');
	} finally {
		await browser.close();
	}
});

test('an invalid submission does not run the success actions', async () => {
	const browser = await chromium.launch();
	try {
		const page = await browser.newPage({ viewport });
		await page.goto(`${baseUrl}/docs/examples/submit-notify-reset`, { waitUntil: 'networkidle' });
		await page.evaluate(() => {
			const events: string[] = [];
			Reflect.set(window, '__actionEvents', events);
			document.addEventListener('se-action-submit-start', () => events.push('submit'));
			document.addEventListener('schema-engine:docs-action-notification', () => events.push('notification'));
		});
		const demo = page.locator('.docs-form-renderer-preview');
		const email = demo.locator('input[name="email"]');
		await demo.locator('button[type="submit"]').click();
		await pwExpect(email).toHaveAttribute('aria-invalid', 'true');
		await pwExpect(demo.getByText('Enter your email', { exact: true })).toBeVisible();
		await pwExpect(
			page.getByRole('status').getByText('You are subscribed. Look out for the next update.', { exact: true }),
		).toHaveCount(0);
		expect(await page.evaluate(() => Reflect.get(window, '__actionEvents'))).toEqual([]);
	} finally {
		await browser.close();
	}
});

test('the homepage form submits and resets', async () => {
	const browser = await chromium.launch();
	try {
		const page = await browser.newPage({ viewport });
		await page.goto(baseUrl, { waitUntil: 'networkidle' });
		const demo = page.locator('.docs-form-renderer-preview');
		const email = demo.locator('input[name="email"]');
		await email.fill('test@example.com');
		await demo.locator('textarea[name="message"]').fill('A test message');
		await demo.locator('button[type="submit"]').click();
		await pwExpect(email).toHaveValue('');
	} finally {
		await browser.close();
	}
});

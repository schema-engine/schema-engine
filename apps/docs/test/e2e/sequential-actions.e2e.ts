import { expect, inject, test } from 'vitest';
import { expect as pwExpect } from '@playwright/test';
import { chromium } from 'playwright';

const baseUrl = inject('docsBaseUrl');

test('sequential actions complete after submission', async () => {
	const browser = await chromium.launch();
	try {
		const page = await browser.newPage();
		const pageErrors: string[] = [];
		page.on('pageerror', (error) => pageErrors.push(error.message));
		await page.goto(`${baseUrl}/docs/examples/sequential-actions`, { waitUntil: 'networkidle' });
		await page.evaluate(() => {
			const events: string[] = [];
			Reflect.set(window, '__actionEvents', events);
			const fetchOriginal = window.fetch.bind(window);
			window.fetch = async (input, init) => {
				const response = await fetchOriginal(input, init);
				if (input === '/api/submit-demo' && init?.method === 'POST') events.push('submit');
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
		await pwExpect(page.getByRole('status').getByText('Submitted successfully', { exact: true })).toBeVisible();
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

test('sequential actions work after navigating within the docs', async () => {
	const browser = await chromium.launch();
	try {
		const page = await browser.newPage();
		await page.goto(`${baseUrl}/docs/getting-started/introduction`, { waitUntil: 'networkidle' });
		await page.evaluate(() => Reflect.set(window, '__docsNavigationProbe', true));
		await page.locator('a[href="/docs/examples/sequential-actions"]').first().click();
		await pwExpect(page).toHaveURL(`${baseUrl}/docs/examples/sequential-actions`);
		expect(await page.evaluate(() => Reflect.get(window, '__docsNavigationProbe'))).toBe(true);
		const demo = page.locator('.docs-form-renderer-preview');
		const email = demo.locator('input[name="email"]');
		await email.fill('test@example.com');
		await demo.locator('button[type="submit"]').click();
		await pwExpect(page.getByRole('status').getByText('Submitted successfully', { exact: true })).toBeVisible();
		await pwExpect(email).toHaveValue('');
	} finally {
		await browser.close();
	}
});

test('invalid submission does not run success actions', async () => {
	const browser = await chromium.launch();
	try {
		const page = await browser.newPage();
		await page.goto(`${baseUrl}/docs/examples/sequential-actions`, { waitUntil: 'networkidle' });
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
		await pwExpect(demo.getByText('Email is required', { exact: true })).toBeVisible();
		await pwExpect(page.getByRole('status').getByText('Submitted successfully', { exact: true })).toHaveCount(0);
		expect(await page.evaluate(() => Reflect.get(window, '__actionEvents'))).toEqual([]);
	} finally {
		await browser.close();
	}
});

test('the homepage form submits and resets', async () => {
	const browser = await chromium.launch();
	try {
		const page = await browser.newPage();
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

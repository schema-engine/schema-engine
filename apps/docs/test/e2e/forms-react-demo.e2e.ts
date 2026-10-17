import { afterAll, afterEach, beforeAll, describe, expect, inject, test } from 'vitest';
import { expect as pwExpect } from '@playwright/test';
import { chromium, type Browser, type Page } from 'playwright';
import { basicContactFormConfig } from '../../src/lib/form-configs/basic-contact';

const baseUrl = inject('docsBaseUrl');
const gettingStartedPath = '/docs/forms-react/getting-started';

/** Waits until the React island hydrator binds RHF to the live demo form. */
async function waitForReactFormHydration(page: Page): Promise<void> {
	await page.waitForSelector('.docs-react-form-demo[data-se-react-form-demo-root="true"]', {
		state: 'visible',
	});

	await page.waitForFunction(
		() => {
			const form = document.querySelector('.docs-react-form-demo form');
			if (!form) {
				return false;
			}
			return Object.keys(form).some((key) => key.startsWith('__react'));
		},
		undefined,
		{ timeout: 30_000 },
	);
}

describe('Forms React docs live demo', () => {
	let browser: Browser;
	let page: Page;
	const pageErrors: string[] = [];

	beforeAll(async () => {
		browser = await chromium.launch();
		page = await browser.newPage();
		page.on('pageerror', (error) => pageErrors.push(error.message));
	});

	afterEach(() => {
		expect(pageErrors.splice(0)).toEqual([]);
	});

	afterAll(async () => {
		await page?.close();
		await browser?.close();
	});

	test('hydrates the getting-started embed and validates on submit', async () => {
		await page.goto(`${baseUrl}${gettingStartedPath}`, { waitUntil: 'networkidle' });
		await waitForReactFormHydration(page);

		const submit = page.locator('.docs-react-form-demo button[type="submit"]');
		const email = page.locator('.docs-react-form-demo input[name="email"]');

		await submit.click();

		await pwExpect(email).toHaveAttribute('aria-invalid', 'true', { timeout: 10_000 });
		const emailError = page.locator('.docs-react-form-demo input[name="email"] + .rui-field__error');
		await pwExpect(emailError).not.toHaveAttribute('hidden');
		await pwExpect(emailError).toContainText(/email/i);
	});

	test('keeps a typed value in form state across a validation render', async () => {
		await page.goto(`${baseUrl}${gettingStartedPath}`, { waitUntil: 'networkidle' });
		await waitForReactFormHydration(page);

		const name = page.locator('.docs-react-form-demo input[name="name"]');
		const email = page.locator('.docs-react-form-demo input[name="email"]');
		await name.fill('Docs e2e');
		await page.locator('.docs-react-form-demo button[type="submit"]').click();

		await pwExpect(email).toHaveAttribute('aria-invalid', 'true', { timeout: 10_000 });
		await pwExpect(name).not.toHaveAttribute('aria-invalid', 'true');
		await pwExpect(name).toHaveValue('Docs e2e');
	});

	test('ships the demo config serialized for client hydration', async () => {
		await page.goto(`${baseUrl}${gettingStartedPath}`, { waitUntil: 'domcontentloaded' });
		const root = page.locator('.docs-react-form-demo[data-se-react-form-demo-root="true"]');
		const serialized = await root.getAttribute('data-se-form-config');
		expect(JSON.parse(serialized ?? 'null')).toEqual(basicContactFormConfig);
	});
});

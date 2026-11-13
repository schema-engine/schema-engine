import { afterAll, afterEach, beforeAll, describe, expect, inject, test } from 'vitest';
import { expect as pwExpect } from '@playwright/test';
import { chromium, type Browser, type Locator, type Page } from 'playwright';

const baseUrl = inject('docsBaseUrl');
const examplesPath = '/docs/examples/react-forms';

const DEMOS = {
	basic: 0,
	validation: 1,
	conditional: 2,
	wizard: 3,
	actions: 4,
	shadcn: 5,
} as const;

/** Waits until React has hydrated every live demo on the page, so a click is not lost to a pre-hydration form. */
async function waitForHydration(page: Page, count = Object.keys(DEMOS).length): Promise<void> {
	await page.waitForFunction(
		(expected) => {
			const forms = [...document.querySelectorAll('.docs-react-form-demo form')];
			return (
				forms.length >= expected &&
				forms.every((form) => Object.keys(form).some((key) => key.startsWith('__react')))
			);
		},
		count,
		{ timeout: 30_000 },
	);
}

function demo(page: Page, name: keyof typeof DEMOS): Locator {
	return page.locator('.docs-react-form-demo').nth(DEMOS[name]);
}

describe('React examples page', () => {
	let browser: Browser;
	let page: Page;
	const problems: string[] = [];

	beforeAll(async () => {
		browser = await chromium.launch();
		page = await browser.newPage();
		page.on('pageerror', (error) => problems.push(error.message));
		page.on('console', (message) => {
			if (message.type() === 'error') problems.push(`console: ${message.text()}`);
		});
	});

	afterEach(() => {
		expect(problems.splice(0)).toEqual([]);
	});

	afterAll(async () => {
		await page?.close();
		await browser?.close();
	});

	/** Loads the page with a marker a full reload would erase. */
	async function open(): Promise<void> {
		await page.goto(`${baseUrl}${examplesPath}`, { waitUntil: 'networkidle' });
		await waitForHydration(page);
		await page.evaluate(() => {
			(window as unknown as { __noReload: boolean }).__noReload = true;
		});
	}

	async function expectNoReload(): Promise<void> {
		expect(await page.evaluate(() => (window as unknown as { __noReload?: boolean }).__noReload)).toBe(true);
		expect(new URL(page.url()).search).toBe('');
		expect(new URL(page.url()).pathname).toBe(examplesPath);
	}

	test('loads directly with every demo hydrated and each source block serialized from its config', async () => {
		await open();
		await pwExpect(page.locator('.docs-react-form-demo')).toHaveCount(6);
		await pwExpect(page.locator('h1')).toHaveText('React Forms');
		const serialized = await page
			.locator('.docs-react-form-demo')
			.evaluateAll((roots) =>
				roots.map((root) => JSON.parse(root.getAttribute('data-se-form-config') ?? 'null').id),
			);
		expect(serialized).toEqual([
			'basic-contact',
			'validation-demo',
			'contact',
			'onboarding',
			'action-demo',
			'shadcn-contact',
		]);
	});

	test('an invalid submit shows errors without a reload or values in the URL, then a valid submit succeeds', async () => {
		await open();
		const form = demo(page, 'basic');
		await form.locator('input[name="name"]').fill('Ada Lovelace');
		await form.locator('button[type="submit"]').click();

		await pwExpect(form.locator('input[name="email"]')).toHaveAttribute('aria-invalid', 'true');
		await pwExpect(form.locator('input[name="email"] + .rui-field__error')).toContainText(/email/i);
		await pwExpect(form.locator('input[name="name"]')).toHaveValue('Ada Lovelace');
		await pwExpect(form.locator('[data-se-demo-result]')).toHaveCount(0);
		await expectNoReload();

		await form.locator('input[name="email"]').fill('ada@example.com');
		await form.locator('button[type="submit"]').click();
		const result = form.locator('[data-se-demo-result]');
		await pwExpect(result).toContainText('Form submitted successfully.');
		await pwExpect(result).toContainText('"email": "ada@example.com"');
		await expectNoReload();
	});

	test('validation rules report each field, then clear as the values become valid', async () => {
		await open();
		const form = demo(page, 'validation');
		await form.locator('button[type="submit"]').click();
		await pwExpect(form.locator('input[name="name"]')).toHaveAttribute('aria-invalid', 'true');
		await pwExpect(form.locator('input[name="email"]')).toHaveAttribute('aria-invalid', 'true');
		await pwExpect(form.locator('input[name="postcode"] + .rui-field__error')).toContainText(
			'Postcode is required',
		);

		await form.locator('input[name="name"]').fill('Ada');
		await form.locator('input[name="email"]').fill('not-an-email');
		await form.locator('input[name="website"]').fill('https://example.com');
		await form.locator('input[name="postcode"]').fill('12ab');
		await form.locator('button[type="submit"]').click();
		await pwExpect(form.locator('input[name="postcode"] + .rui-field__error')).toContainText('Use five digits');
		await pwExpect(form.locator('input[name="email"] + .rui-field__error')).toContainText('Enter a valid email');
		await pwExpect(form.locator('[data-se-demo-result]')).toHaveCount(0);

		await form.locator('input[name="email"]').fill('ada@example.com');
		await form.locator('input[name="postcode"]').fill('12345');
		await form.locator('button[type="submit"]').click();
		await pwExpect(form.locator('[data-se-demo-result]')).toContainText('Form submitted successfully.');
		await expectNoReload();
	});

	test('a conditional field appears for its trigger value and is required there', async () => {
		await open();
		const form = demo(page, 'conditional');
		await pwExpect(form.locator('input[name="ticket"]')).toHaveCount(0);

		await form.locator('select[name="subject"]').selectOption('support');
		await pwExpect(form.locator('input[name="ticket"]')).toBeVisible();

		await form.locator('textarea[name="message"]').fill('It does not start.');
		await form.locator('button[type="submit"]').click();
		await pwExpect(form.locator('input[name="ticket"]')).toHaveAttribute('aria-invalid', 'true');

		await form.locator('input[name="ticket"]').fill('T-100');
		await form.locator('button[type="submit"]').click();
		await pwExpect(form.locator('[data-se-demo-result]')).toContainText('"ticket": "T-100"');
	});

	test('a wizard blocks Next on an invalid step, keeps values across steps and submits from the last', async () => {
		await open();
		const form = demo(page, 'wizard');
		const next = form.getByRole('button', { name: 'Next' });

		await next.click();
		await pwExpect(form.locator('input[name="email"]')).toHaveAttribute('aria-invalid', 'true');
		await pwExpect(form.locator('select[name="role"]')).toHaveCount(0);

		await form.locator('input[name="email"]').fill('ada@example.com');
		await form.locator('input[name="password"]').fill('correct-horse');
		await next.click();
		await pwExpect(form.locator('select[name="role"]')).toBeVisible();

		await form.getByRole('button', { name: 'Previous' }).click();
		await pwExpect(form.locator('input[name="email"]')).toHaveValue('ada@example.com');
		await pwExpect(form.locator('input[name="password"]')).toHaveValue('correct-horse');

		await next.click();
		await form.locator('select[name="role"]').selectOption('designer');
		await form.getByRole('button', { name: 'Submit' }).click();
		const result = form.locator('[data-se-demo-result]');
		await pwExpect(result).toContainText('"email": "ada@example.com"');
		await pwExpect(result).toContainText('"role": "designer"');
		await expectNoReload();
	});

	test('the actions form submits through its configured pipeline and shows the result', async () => {
		await open();
		const form = demo(page, 'actions');
		await form.locator('input[name="email"]').fill('ada@example.com');
		await form.locator('button[type="submit"]').click();
		await pwExpect(form.locator('[data-se-demo-result]')).toContainText('Form submitted successfully.', {
			timeout: 10_000,
		});
		await expectNoReload();
	});

	test('the copied shadcn field and recipe validate and submit without a React context error', async () => {
		await open();
		const form = demo(page, 'shadcn');
		await pwExpect(form.locator('[data-slot="input"]').first()).toBeVisible();
		await pwExpect(form.locator('.se-card-shell')).toBeVisible();

		await form.locator('button[type="submit"]').click();
		await pwExpect(form.locator('input[name="name"]')).toHaveAttribute('aria-invalid', 'true');
		await pwExpect(form.getByText('Name is required')).toBeVisible();
		await pwExpect(form.locator('[data-se-demo-result]')).toHaveCount(0);

		await form.locator('input[name="name"]').fill('Ada Lovelace');
		await form.locator('input[name="email"]').fill('ada@example.com');
		await form.locator('button[type="submit"]').click();
		await pwExpect(form.locator('[data-se-demo-result]')).toContainText('"name": "Ada Lovelace"');
		await expectNoReload();
	});

	test('navigating between docs pages hydrates the demos of the page that arrives', async () => {
		await page.goto(`${baseUrl}/docs/examples/basic-form`, { waitUntil: 'networkidle' });
		await page.evaluate(() => {
			(window as unknown as { __noReload: boolean }).__noReload = true;
		});

		await page.locator(`a[href="${examplesPath}"]`).first().click();
		await page.waitForURL(`**${examplesPath}`);
		await waitForHydration(page);
		const form = demo(page, 'basic');
		await form.locator('button[type="submit"]').click();
		await pwExpect(form.locator('input[name="email"]')).toHaveAttribute('aria-invalid', 'true');

		await page.locator('a[href="/docs/forms-react/getting-started"]').first().click();
		await page.waitForURL('**/docs/forms-react/getting-started');
		await waitForHydration(page, 1);
		await page.locator('.docs-react-form-demo button[type="submit"]').click();
		await pwExpect(page.locator('.docs-react-form-demo input[name="email"]')).toHaveAttribute(
			'aria-invalid',
			'true',
		);

		await page.goBack();
		await page.waitForURL(`**${examplesPath}`);
		await waitForHydration(page);
		await demo(page, 'shadcn').locator('button[type="submit"]').click();
		await pwExpect(demo(page, 'shadcn').locator('input[name="name"]')).toHaveAttribute('aria-invalid', 'true');
		expect(await page.evaluate(() => (window as unknown as { __noReload?: boolean }).__noReload)).toBe(true);
	});

	test('the Radiant examples stay live and link to their React counterparts', async () => {
		await page.goto(`${baseUrl}/docs/examples/basic-form`, { waitUntil: 'networkidle' });
		const radiantForm = page.locator('.docs-form-renderer-preview form').first();
		await pwExpect(radiantForm).toBeVisible();
		await radiantForm.locator('button[type="submit"]').click();
		await pwExpect(radiantForm.locator('[aria-invalid="true"]').first()).toBeVisible();
		await pwExpect(page.locator(`main a[href="${examplesPath}#basic-form"]`)).toBeVisible();
		await pwExpect(page.locator('.docs-react-form-demo')).toHaveCount(0);
	});

	test('every in-page link into the React examples lands on an existing heading', async () => {
		const paths = [
			'/docs/examples/basic-form',
			'/docs/examples/contact-form',
			'/docs/examples/registration-flow',
			'/docs/examples/survey-form',
			'/docs/examples/sequential-actions',
			'/docs/forms/validation',
			'/docs/forms-react/getting-started',
			'/docs/forms-react/overview',
			'/docs/forms-react/layouts',
		];
		const anchors = new Set<string>();
		for (const path of paths) {
			const html = await (await fetch(`${baseUrl}${path}`)).text();
			const links = [...html.matchAll(/href="\/docs\/examples\/react-forms(#[a-z-]+)?"/g)];
			expect(links.length, `${path} links to the React examples`).toBeGreaterThan(0);
			for (const [, hash] of links) if (hash) anchors.add(hash.slice(1));
		}
		const target = await (await fetch(`${baseUrl}${examplesPath}`)).text();
		for (const id of anchors) {
			expect(target, `heading #${id}`).toContain(`id="${id}"`);
		}
	});
});

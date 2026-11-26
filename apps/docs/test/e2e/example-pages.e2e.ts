import { afterAll, afterEach, beforeAll, describe, expect, inject, test } from 'vitest';
import { expect as pwExpect } from '@playwright/test';
import { chromium, type Browser, type Page } from 'playwright';

const baseUrl = inject('docsBaseUrl');
const contactPath = '/docs/examples/contact-form';
const wizardPath = '/docs/examples/registration-wizard';
const surveyPath = '/docs/examples/branching-survey';
const shadcnPath = '/docs/forms-react/components';

/** Waits until React has hydrated every live demo on the page, so a click is not lost to a pre-hydration form. */
async function waitForHydration(page: Page, count = 1): Promise<void> {
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

describe('the forms example pages', () => {
	let browser: Browser;
	let page: Page;
	const problems: string[] = [];

	beforeAll(async () => {
		browser = await chromium.launch();
		page = await browser.newPage({ viewport: { width: 1700, height: 900 } });
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

	/** Loads a page with a marker a full reload would erase. */
	async function open(path: string, demos = 1): Promise<void> {
		await page.goto(`${baseUrl}${path}`, { waitUntil: 'networkidle' });
		await waitForHydration(page, demos);
		await page.evaluate(() => {
			(window as unknown as { noReloadMarker: boolean }).noReloadMarker = true;
		});
	}

	async function expectNoReload(path: string): Promise<void> {
		expect(await page.evaluate(() => (window as unknown as { noReloadMarker?: boolean }).noReloadMarker)).toBe(
			true,
		);
		expect(new URL(page.url()).search).toBe('');
		expect(new URL(page.url()).pathname).toBe(path);
	}

	const react = () => page.locator('.docs-react-form-demo').first();

	/** The notice a `show_notification` action of the config raised, which the docs shell shows as a toast. */
	const notice = (message: string) => page.getByRole('status').getByText(message, { exact: true });
	const expectNotice = (message: string) => pwExpect(notice(message)).toBeVisible();

	test('the contact form loads with its React demo hydrated and its Radiant demo rendered', async () => {
		await open(contactPath);
		await pwExpect(page.locator('h1')).toHaveText('Contact form');
		await pwExpect(page.locator('.docs-react-form-demo')).toHaveCount(1);
		const config = JSON.parse((await react().getAttribute('data-se-form-config')) ?? 'null');
		expect(config.id).toBe('contact');
		await pwExpect(page.locator('.docs-form-renderer-preview form')).toBeVisible();
	});

	test('an invalid submit shows each message without a reload or values in the URL, then a valid one clears them', async () => {
		await open(contactPath);
		const form = react();
		await form.locator('button[type="submit"]').click();

		await pwExpect(form.locator('input[name="name"]')).toHaveAttribute('aria-invalid', 'true');
		await pwExpect(form.locator('input[name="email"] + .rui-field__error')).toContainText('Enter your email');
		await pwExpect(notice('Message sent. We answer within one working day.')).toHaveCount(0);
		await expectNoReload(contactPath);

		await form.locator('input[name="name"]').fill('Ada Lovelace');
		await form.locator('input[name="email"]').fill('not-an-email');
		await form.locator('select[name="subject"]').selectOption('general');
		await form.locator('textarea[name="message"]').fill('Hello there, team.');
		await form.locator('button[type="submit"]').click();
		await pwExpect(form.locator('input[name="email"] + .rui-field__error')).toContainText(
			'Enter a valid email address',
		);

		await form.locator('input[name="email"]').fill('ada@example.com');
		await form.locator('button[type="submit"]').click();
		await expectNotice('Message sent. We answer within one working day.');
		await pwExpect(form.locator('[aria-invalid="true"]')).toHaveCount(0);
		await expectNoReload(contactPath);
	});

	test('the React demo marks every required field and shows an invalid select, as the Radiant demo does', async () => {
		await open(contactPath);
		const form = react();
		const radiant = page.locator('.docs-form-renderer-preview form').first();
		for (const scope of [form, radiant]) {
			await pwExpect(scope.locator('[data-se-required-marker]:visible')).toHaveCount(4);
		}

		const select = form.locator('select[name="subject"]');
		const border = (control: typeof select) =>
			control.evaluate((element) => getComputedStyle(element).borderTopColor);
		const before = await border(select);
		await form.locator('button[type="submit"]').click();
		await pwExpect(select).toHaveAttribute('aria-invalid', 'true');
		await pwExpect(select).not.toHaveCSS('border-top-color', before);
		const name = form.locator('input[name="name"]');
		await pwExpect(name).toHaveAttribute('aria-invalid', 'true');
		await pwExpect.poll(async () => (await border(select)) === (await border(name))).toBe(true);
	});

	test('the React wizard draws the steps and the counter from the same config as the Radiant one', async () => {
		await open(wizardPath);
		const form = react();
		const radiant = page.locator('.docs-form-renderer-preview').first();
		for (const scope of [form, radiant]) {
			await pwExpect(scope.getByText('Step 1 of 2')).toBeVisible();
			await pwExpect(scope.getByRole('button', { name: /Profile/ })).toBeDisabled();
			await pwExpect(scope.getByRole('button', { name: /Account/ })).toHaveAttribute('aria-current', 'step');
		}
	});

	test('the Radiant demo shows the same notice after a valid submit', async () => {
		await page.goto(`${baseUrl}${contactPath}`, { waitUntil: 'networkidle' });
		const radiantForm = page.locator('.docs-form-renderer-preview form').first();
		await pwExpect(radiantForm).toBeVisible();
		await radiantForm.locator('input[name="name"]').fill('Ada Lovelace');
		await radiantForm.locator('input[name="email"]').fill('ada@example.com');
		await radiantForm.locator('[data-select-trigger]').click();
		await radiantForm.locator('[data-value="general"]').click();
		await radiantForm.locator('textarea[name="message"]').fill('Hello there, team.');
		await radiantForm.locator('button[type="submit"]').click();
		await expectNotice('Message sent. We answer within one working day.');
	});

	test('the ticket field appears for a support request and is checked in its shape', async () => {
		await open(contactPath);
		const form = react();
		await pwExpect(form.locator('input[name="ticket"]')).toHaveCount(0);

		await form.locator('select[name="subject"]').selectOption('support');
		await pwExpect(form.locator('input[name="ticket"]')).toBeVisible();

		await form.locator('input[name="name"]').fill('Ada Lovelace');
		await form.locator('input[name="email"]').fill('ada@example.com');
		await form.locator('textarea[name="message"]').fill('It does not start.');
		await form.locator('button[type="submit"]').click();
		await pwExpect(form.locator('input[name="ticket"]')).toHaveAttribute('aria-invalid', 'true');

		await form.locator('input[name="ticket"]').fill('ticket 1');
		await form.locator('button[type="submit"]').click();
		await pwExpect(form.locator('input[name="ticket"] + .rui-field__error')).toContainText(
			'Use a ticket number such as SUP-1024',
		);

		await form.locator('input[name="ticket"]').fill('SUP-1024');
		await form.locator('button[type="submit"]').click();
		await expectNotice('Message sent. We answer within one working day.');
		await pwExpect(form.locator('[aria-invalid="true"]')).toHaveCount(0);
	});

	test('a wizard blocks Next on an invalid step, keeps values across steps and submits from the last', async () => {
		await open(wizardPath);
		const form = react();
		const next = form.getByRole('button', { name: 'Next' });

		await next.click();
		await pwExpect(form.locator('input[name="email"]')).toHaveAttribute('aria-invalid', 'true');
		await pwExpect(form.locator('select[name="role"]')).toHaveCount(0);

		await form.locator('input[name="email"]').fill('ada@example.com');
		await form.locator('input[name="password"]').fill('short');
		await next.click();
		await pwExpect(form.locator('input[name="password"] + .rui-field__error')).toContainText(
			'Use at least 12 characters',
		);

		await form.locator('input[name="password"]').fill('correct horse battery');
		await next.click();
		await pwExpect(form.locator('select[name="role"]')).toBeVisible();

		await form.getByRole('button', { name: 'Previous' }).click();
		await pwExpect(form.locator('input[name="email"]')).toHaveValue('ada@example.com');
		await pwExpect(form.locator('input[name="password"]')).toHaveValue('correct horse battery');

		await next.click();
		await form.locator('input[name="name"]').fill('Ada Lovelace');
		await form.locator('select[name="role"]').selectOption('designer');
		await form.getByRole('button', { name: 'Submit' }).click();
		await expectNotice('Account created. Welcome aboard.');
		await pwExpect(form.locator('[aria-invalid="true"]')).toHaveCount(0);
		await expectNoReload(wizardPath);
	});

	test('a branching survey skips its follow-up step for a good answer and opens it for a poor one', async () => {
		await open(surveyPath);
		const form = react();
		const next = form.getByRole('button', { name: 'Next' });

		await form.locator('input[name="name"]').fill('Ada Lovelace');
		await form.locator('select[name="satisfaction"]').selectOption('great');
		await next.click();
		await pwExpect(form.locator('textarea[name="comments"]')).toBeVisible();
		await pwExpect(form.locator('select[name="reason"]')).toHaveCount(0);

		await form.getByRole('button', { name: 'Previous' }).click();
		await form.locator('select[name="satisfaction"]').selectOption('poor');
		await next.click();
		await pwExpect(form.locator('select[name="reason"]')).toBeVisible();
		await next.click();
		await pwExpect(form.locator('select[name="reason"]')).toHaveAttribute('aria-invalid', 'true');
		await pwExpect(form.locator('textarea[name="comments"]')).toHaveCount(0);
		await expectNoReload(surveyPath);
	});

	test('the renderer tabs show one renderer at a time, with the files of that renderer', async () => {
		await page.goto(`${baseUrl}${contactPath}`, { waitUntil: 'networkidle' });
		const tabs = page.locator('.renderer-tabs:not([data-side-by-side])');
		const reactPanel = tabs.locator('[data-renderer="react"]');
		const radiantPanel = tabs.locator('[data-renderer="radiant"]');

		await pwExpect(reactPanel).toBeVisible();
		await pwExpect(radiantPanel).toBeHidden();
		await pwExpect(reactPanel.locator('figure[data-title="contact-form.react.tsx"]')).toBeVisible();
		await pwExpect(reactPanel).toContainText('createFormEngine');

		await tabs.getByRole('radio', { name: 'Radiant' }).check();
		await pwExpect(radiantPanel).toBeVisible();
		await pwExpect(reactPanel).toBeHidden();
		await pwExpect(radiantPanel).toContainText('createRadiantFormEngine');
		await pwExpect(radiantPanel.locator('figure[data-title="contact-form.radiant.tsx"]')).toBeVisible();
	});

	test('the demos sit side by side when the column has room for two forms, and behind tabs when it has not', async () => {
		await page.goto(`${baseUrl}${contactPath}`, { waitUntil: 'networkidle' });
		const demo = page.locator('[data-example="contact"]');
		const tabs = demo.locator('.renderer-tabs');
		const react = demo.locator('[data-renderer="react"]');
		const radiant = demo.locator('[data-renderer="radiant"]');

		await pwExpect(react).toBeVisible();
		await pwExpect(radiant).toBeVisible();
		await pwExpect(tabs.locator('.renderer-tabs__list')).toBeHidden();
		const [left, right] = [await react.boundingBox(), await radiant.boundingBox()];
		expect(right!.x).toBeGreaterThan(left!.x + left!.width - 1);
		expect(left!.y).toBe(right!.y);
		expect(left!.width).toBeGreaterThanOrEqual(384);

		try {
			await page.setViewportSize({ width: 1300, height: 900 });
			await pwExpect(tabs.locator('.renderer-tabs__list')).toBeVisible();
			await pwExpect(react).toBeVisible();
			await pwExpect(radiant).toBeHidden();
			await tabs.getByRole('radio', { name: 'Radiant' }).check();
			await pwExpect(radiant).toBeVisible();
			await pwExpect(react).toBeHidden();
		} finally {
			await page.setViewportSize({ width: 1700, height: 900 });
		}
	});

	test('navigating between docs pages hydrates the demos of the page that arrives', async () => {
		await page.goto(`${baseUrl}/docs/schema-engine/introduction`, { waitUntil: 'networkidle' });
		await page.evaluate(() => {
			(window as unknown as { noReloadMarker: boolean }).noReloadMarker = true;
		});

		await page.locator(`#docs-sidebar a[href="${contactPath}"]:visible`).first().click();
		await page.waitForURL(`**${contactPath}`);
		await waitForHydration(page);
		await react().locator('button[type="submit"]').click();
		await pwExpect(react().locator('input[name="email"]')).toHaveAttribute('aria-invalid', 'true');

		await page.locator(`#docs-sidebar a[href="${wizardPath}"]:visible`).first().click();
		await page.waitForURL(`**${wizardPath}`);
		await waitForHydration(page);
		await react().getByRole('button', { name: 'Next' }).click();
		await pwExpect(react().locator('input[name="email"]')).toHaveAttribute('aria-invalid', 'true');

		await page.goBack();
		await page.waitForURL(`**${contactPath}`);
		await waitForHydration(page);
		await react().locator('button[type="submit"]').click();
		await pwExpect(react().locator('input[name="name"]')).toHaveAttribute('aria-invalid', 'true');
		expect(await page.evaluate(() => (window as unknown as { noReloadMarker?: boolean }).noReloadMarker)).toBe(
			true,
		);
	});

	test('the Radiant demo of an example validates on submit', async () => {
		await page.goto(`${baseUrl}${contactPath}`, { waitUntil: 'networkidle' });
		const radiantForm = page.locator('.docs-form-renderer-preview form').first();
		await pwExpect(radiantForm).toBeVisible();
		await radiantForm.locator('button[type="submit"]').click();
		await pwExpect(radiantForm.locator('[aria-invalid="true"]').first()).toBeVisible();
	});

	test('the copied shadcn field and recipe validate and submit without a React context error', async () => {
		await open(shadcnPath);
		const form = page.locator('[data-se-react-form-demo-kit="shadcn"]');
		await pwExpect(form.locator('[data-slot="input"]').first()).toBeVisible();
		await pwExpect(form.locator('.se-card-shell')).toBeVisible();

		await form.locator('button[type="submit"]').click();
		await pwExpect(form.locator('input[name="name"]')).toHaveAttribute('aria-invalid', 'true');
		await pwExpect(form.getByText('Name is required')).toBeVisible();

		await form.locator('input[name="name"]').fill('Ada Lovelace');
		await form.locator('input[name="email"]').fill('ada@example.com');
		await form.locator('button[type="submit"]').click();
		await expectNotice('Message sent.');
		await expectNoReload(shadcnPath);
	});

	test('only the page that shows the shadcn example downloads its engine and stylesheets', async () => {
		const sheets = async (path: string): Promise<string[]> => {
			const html = await (await fetch(`${baseUrl}${path}`)).text();
			const hrefs = [...html.matchAll(/href="(\/assets\/[a-f0-9]+\.css)"/g)].map((match) => match[1]!);
			const bodies = await Promise.all(hrefs.map(async (href) => (await fetch(`${baseUrl}${href}`)).text()));
			return bodies.filter(
				(css) => css.includes(':where(.se-card-shell)') || css.includes('--se-control-height,revert-layer'),
			);
		};
		expect(await sheets(contactPath)).toEqual([]);
		expect(await sheets('/docs/forms-react/getting-started')).toEqual([]);
		expect(await sheets('/docs/examples/theming')).toEqual([]);
		expect((await sheets(shadcnPath)).length).toBe(2);

		const requested: string[] = [];
		const onRequest = (request: { url: () => string }) => requested.push(request.url());
		page.on('request', onRequest);
		await page.goto(`${baseUrl}${contactPath}`, { waitUntil: 'networkidle' });
		await waitForHydration(page);
		expect(requested.filter((url) => /shadcn-engine/.test(url))).toEqual([]);

		requested.length = 0;
		await open(shadcnPath);
		page.off('request', onRequest);
		expect(requested.filter((url) => /shadcn-engine/.test(url))).not.toEqual([]);
	});
});

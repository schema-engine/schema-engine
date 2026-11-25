import { afterAll, beforeAll, describe, expect, inject, test } from 'vitest';
import { expect as pwExpect } from '@playwright/test';
import { chromium, type Browser, type Locator, type Page } from 'playwright';

const baseUrl = inject('docsBaseUrl');
const pagePath = '/docs/examples/theming';

const RENDERERS = [
	['React', '[data-renderer="react"]'],
	['Radiant', '[data-renderer="radiant"]'],
] as const;

/** What a form of one renderer looks like: the tone it carries, its colour roles, its corners and its type. */
function look(root: Locator) {
	return root.evaluate((panel) => {
		const input = panel.querySelector('input[name$="first"]')!;
		const submit = panel.querySelector('button[type="submit"]')!;
		const style = getComputedStyle(input);
		return {
			tone: panel.querySelector('[data-se-tone]')?.getAttribute('data-se-tone'),
			primary: style.getPropertyValue('--primary').trim(),
			submit: getComputedStyle(submit).backgroundColor,
			radius: style.borderTopLeftRadius,
			font: style.fontFamily,
			heading: getComputedStyle(panel.querySelector('h2')!).fontFamily,
		};
	});
}

const CONFIG_PICKS = 'Tone brand, Shape rounded, Font sans, Size compact, Surface outlined';

describe('the theming playground', () => {
	let browser: Browser;
	let page: Page;
	const problems: string[] = [];

	beforeAll(async () => {
		browser = await chromium.launch();
		page = await browser.newPage({ viewport: { width: 1700, height: 1000 } });
		page.on('pageerror', (error) => problems.push(error.message));
	});

	afterAll(async () => {
		await page?.close();
		await browser?.close();
	});

	/** Opens the themed form page, wide enough to show both renderers, and waits until React has hydrated. */
	async function open(): Promise<void> {
		problems.length = 0;
		await page.goto(`${baseUrl}${pagePath}`, { waitUntil: 'networkidle' });
		await page.waitForFunction(() => {
			const form = document.querySelector('.docs-react-form-demo form');
			return form !== null && Object.keys(form).some((key) => key.startsWith('__react'));
		});
	}

	const playground = () => page.locator('[data-theming-playground]');
	const status = () => playground().getByRole('status');
	const shuffle = () => playground().getByRole('button', { name: 'Shuffle' });
	const demo = (renderer: string) => page.locator(`[data-example="themed"] ${renderer}`);

	/** The picks the status line names, keyed by axis. */
	async function picks(): Promise<Record<string, string>> {
		const text = (await status().textContent()) ?? '';
		return Object.fromEntries(
			text.split(', ').map((entry) => {
				const [label, value] = entry.split(' ');
				return [label!.toLowerCase(), value!];
			}),
		);
	}

	test('opens on the picks of the config, in the status line and in both forms', async () => {
		await open();
		await pwExpect(status()).toHaveText(CONFIG_PICKS);
		for (const [, renderer] of RENDERERS) {
			const form = await look(demo(renderer));
			expect(form.tone).toBe('brand');
			expect(form.primary).toBe('#c2410c');
			expect(form.radius).toBe('4.2px');
			expect(form.font).not.toContain('monospace');
		}
	});

	test('Shuffle changes the combination every time, names it, and both forms follow it', async () => {
		await open();
		let before = await picks();
		for (let round = 0; round < 4; round += 1) {
			const text = (await status().textContent()) ?? '';
			await shuffle().click();
			await pwExpect(status()).not.toHaveText(text);
			const after = await picks();
			expect(after, `round ${round}`).not.toEqual(before);
			for (const [name, renderer] of RENDERERS) {
				await pwExpect(demo(renderer).locator(`[data-se-tone="${after.tone}"]`).first(), name).toBeAttached();
				await pwExpect(
					demo(renderer).locator(`[data-se-size="${after.size}"][data-se-surface="${after.surface}"]`),
					name,
				).toHaveCount(1);
			}
			before = after;
		}
		expect(problems).toEqual([]);
	});

	test('after a shuffle the React form and the Radiant form look the same', async () => {
		await open();
		for (let round = 0; round < 3; round += 1) {
			await shuffle().click();
			const { tone } = await picks();
			for (const [, renderer] of RENDERERS) {
				await pwExpect(demo(renderer).locator(`[data-se-tone="${tone}"]`).first()).toBeAttached();
			}
			const [react, radiant] = await Promise.all(RENDERERS.map(([, renderer]) => look(demo(renderer))));
			expect(radiant, `round ${round}`).toEqual(react);
		}
	});

	test('the pill shape rounds the controls fully and leaves the card its corners', async () => {
		await open();
		for (let round = 0; round < 40 && (await picks()).shape !== 'pill'; round += 1) await shuffle().click();
		expect((await picks()).shape).toBe('pill');
		for (const [name, renderer] of RENDERERS) {
			await pwExpect(demo(renderer).locator('[data-se-shape="pill"]').first(), name).toBeAttached();
			const corners = await demo(renderer).evaluate((panel) => {
				const input = panel.querySelector('input[name="first"]')!;
				const card = panel.querySelector('[data-se-surface]')!;
				return {
					input: getComputedStyle(input).borderTopLeftRadius,
					card: getComputedStyle(card).borderTopLeftRadius,
				};
			});
			expect(corners, name).toEqual({ input: '9999px', card: '24px' });
		}
	});

	test('a shuffle changes nothing on another example page', async () => {
		await page.goto(`${baseUrl}/docs/examples/contact-form`, { waitUntil: 'networkidle' });
		await pwExpect(page.locator('[data-theming-playground]')).toHaveCount(0);
		await pwExpect(page.locator('[data-example="contact"]')).toHaveCount(1);
	});
});

describe('the theming page without a script', () => {
	test('renders both forms and the status line with the picks of the config', async () => {
		const browser = await chromium.launch();
		const context = await browser.newContext({ javaScriptEnabled: false });
		const page = await context.newPage();
		await page.goto(`${baseUrl}${pagePath}`);
		for (const [, renderer] of RENDERERS) {
			await pwExpect(
				page.locator(`[data-example="themed"] ${renderer} [data-se-tone="brand"]`).first(),
			).toBeAttached();
		}
		await pwExpect(page.locator('[data-theming-playground]').getByRole('status')).toHaveText(CONFIG_PICKS);
		await context.close();
		await browser.close();
	});
});

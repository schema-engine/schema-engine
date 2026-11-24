import { afterAll, beforeAll, describe, expect, inject, test } from 'vitest';
import { expect as pwExpect } from '@playwright/test';
import { chromium, type Browser, type BrowserContext, type Page } from 'playwright';

const baseUrl = inject('docsBaseUrl');

const STYLING_PAGES = [
	['/docs/layout/overview', 'Layout'],
	['/docs/layout/layout-themes', 'Layout themes'],
	['/docs/layout/appearance-axes', 'Appearance axes'],
	['/docs/layout/theming', 'Theming'],
	['/docs/examples/contact-card', 'A contact card'],
	['/docs/registry/registries', 'Read-only and mutable registries'],
] as const;

/** The layout examples, one page each, and the renderers their demos show. */
const EXAMPLE_IDS = [
	'contact-card',
	'address-form',
	'checkout-wizard',
	'drawn-layout',
	'brand-theme',
	'shared-theme',
	'tight-size',
	'brand-frame',
	'acme-theme',
];

describe('styling docs pages', () => {
	let browser: Browser;
	let context: BrowserContext;
	let page: Page;
	const pageErrors: string[] = [];

	beforeAll(async () => {
		browser = await chromium.launch();
		context = await browser.newContext({ permissions: ['clipboard-read', 'clipboard-write'] });
		page = await context.newPage();
		page.on('pageerror', (error) => pageErrors.push(error.message));
	});

	afterAll(async () => {
		await context?.close();
		await browser?.close();
	});

	test.each(STYLING_PAGES)('%s loads with its heading, without script errors', async (path, title) => {
		pageErrors.length = 0;
		const response = await page.goto(`${baseUrl}${path}`, { waitUntil: 'networkidle' });
		expect(response?.status()).toBe(200);
		await pwExpect(page.locator('h1').first()).toHaveText(title);
		expect(pageErrors).toEqual([]);
	});

	test('the sidebar lists the Styling section after Forms Radiant', async () => {
		await page.goto(`${baseUrl}/docs/layout/overview`, { waitUntil: 'networkidle' });
		const section = page.locator('a[href="/docs/layout/overview"]').first();
		await pwExpect(section).toBeAttached();
		for (const [path] of STYLING_PAGES.slice(0, 5)) {
			await pwExpect(page.locator(`a[href="${path}"]`).first()).toBeAttached();
		}
		await pwExpect(page.locator('a[href="/docs/registry/registries"]').first()).toBeAttached();
	});

	test('the llms exports carry the new pages', async () => {
		const index = await (await fetch(`${baseUrl}/llms.txt`)).text();
		expect(index).toContain('/docs-llm/examples/contact-card.md');
		const markdown = await (await fetch(`${baseUrl}/docs-llm/examples/contact-card.md`)).text();
		expect(markdown).toContain('two half-width fields');
	});

	/** Rectangles of named inputs of one recipe, read in one frame so a reflow cannot split them. */
	async function rects(
		recipe: string,
		names: string[],
		renderer = 'radiant',
	): Promise<Array<{ x: number; y: number; width: number }>> {
		await page.evaluate(
			() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))),
		);
		return page.evaluate(
			([id, fields, which]) =>
				fields!.map((name) => {
					const input = document.querySelector(
						`[data-example="${id}"] [data-renderer="${which}"] input[name$="${name}"]`,
					)!;
					const { x, y, width } = input.getBoundingClientRect();
					return { x, y, width };
				}),
			[recipe, names, renderer] as [string, string[], string],
		);
	}

	/** Opens the page of a layout example and waits until React has hydrated the demos it has. */
	async function openExample(id: string): Promise<void> {
		pageErrors.length = 0;
		await page.setViewportSize({ width: 1300, height: 900 });
		await page.goto(`${baseUrl}/docs/examples/${id}`, { waitUntil: 'networkidle' });
		if ((await page.locator('.docs-react-form-demo').count()) > 0) {
			await page.waitForFunction(() => {
				const form = document.querySelector('.docs-react-form-demo form');
				return form !== null && Object.keys(form).some((key) => key.startsWith('__react'));
			});
		}
	}

	describe('the layout example pages', () => {
		test.each(EXAMPLE_IDS)('%s renders each of its demos on a page without script errors', async (id) => {
			await openExample(id);
			const demos = page.locator('[data-example] .example-demo__demo');
			const count = await demos.count();
			expect(count, id).toBeGreaterThan(0);
			for (let index = 0; index < count; index += 1) {
				await pwExpect(demos.nth(index).locator('input').first(), id).toBeVisible();
			}
			expect(pageErrors).toEqual([]);
		});

		test.each(['radiant', 'react'])('%s: a half-width pair shares a row and the rest fill it', async (renderer) => {
			await openExample('contact-card');
			const [first, last, email] = await rects('contact-card', ['first', 'last', 'email'], renderer);
			expect(first!.y).toBeCloseTo(last!.y, 0);
			expect(first!.width).toBeCloseTo(last!.width, 0);
			expect(email!.y).toBeGreaterThan(first!.y);
			expect(email!.width).toBeGreaterThan(first!.width * 1.9);
		});

		test('a fieldset places its children on its own grid', async () => {
			await openExample('address-form');
			const [city, zip, region, country] = await rects('address-form', ['city', 'zip', 'region', 'country']);
			expect(city!.y).toBeCloseTo(zip!.y, 0);
			expect(city!.width).toBeGreaterThan(zip!.width * 1.8);
			expect(region!.y).toBeCloseTo(country!.y, 0);
			expect(region!.y).toBeGreaterThan(city!.y);
		});

		test('the drawn layout follows the breakpoint', async () => {
			await openExample('drawn-layout');
			const names = ['a', 'b', 'c', 'd', 'e'];
			const [a, b, c, d, e] = await rects('drawn-layout', names);
			expect(b!.x).toBeGreaterThan(a!.x + a!.width - 1);
			expect(c!.x).toBeCloseTo(b!.x, 0);
			expect(c!.y).toBeGreaterThan(b!.y);
			expect(d!.y).toBeCloseTo(e!.y, 0);
			expect(d!.y).toBeGreaterThan(c!.y);

			await page.setViewportSize({ width: 420, height: 900 });
			const stacked = await rects('drawn-layout', names);
			for (let index = 1; index < stacked.length; index += 1) {
				expect(stacked[index]!.x).toBeCloseTo(stacked[0]!.x, 0);
				expect(stacked[index]!.y).toBeGreaterThan(stacked[index - 1]!.y);
			}
			await page.setViewportSize({ width: 1300, height: 900 });
		});

		test('the tone axis writes its attribute and sets the colour roles', async () => {
			await openExample('brand-theme');
			const form = page.locator('rui-form.brand-form');
			await pwExpect(form).toHaveAttribute('data-se-tone', 'brand');
			expect(
				await form.evaluate((element) => getComputedStyle(element).getPropertyValue('--primary').trim()),
			).toBe('#c2410c');
		});

		test('two engines on one theme share its id and each picks its own tone', async () => {
			await openExample('shared-theme');
			const forms = page.locator('[data-example] rui-form');
			const themes = await forms.evaluateAll((elements) =>
				elements.map((element) => element.getAttribute('data-se-theme')),
			);
			expect(new Set(themes).size).toBe(1);
			const tones = await forms.evaluateAll((elements) =>
				elements.map((element) => element.getAttribute('data-se-tone')),
			);
			expect(tones).toEqual(['brand', 'forest']);
		});

		test.each([
			['radiant', '.card-shell__section'],
			['react', '.se-demo-shell__card'],
		])('%s: size hooks set on the form class reach the compact card and its controls', async (renderer, card) => {
			await openExample('tight-size');
			const demo = page.locator(`[data-example="tight-size"] [data-renderer="${renderer}"]`);
			expect(
				await demo
					.locator(card)
					.first()
					.evaluate((element) => getComputedStyle(element).paddingTop),
			).toBe('8px');
			expect(
				await demo
					.locator('input')
					.first()
					.evaluate((element) => element.getBoundingClientRect().height),
			).toBe(24);
		});

		test('the custom recipe frames both renderers', async () => {
			await openExample('brand-frame');
			for (const renderer of ['react', 'radiant']) {
				const demo = page.locator(`[data-example="brand-frame"] [data-renderer="${renderer}"]`);
				await pwExpect(demo.locator('.brand-frame__label')).toHaveText('Newsletter');
			}
		});

		test('the theme file of a form is in force: its colour roles, its picks and its size hooks', async () => {
			await openExample('acme-theme');
			const form = page.locator('[data-example="acme-theme"] rui-form.acme');
			await pwExpect(form).toBeVisible();
			await pwExpect(
				page.locator('[data-example="acme-theme"] [data-se-size="comfortable"]').first(),
			).toBeAttached();
			expect(
				await form.evaluate((element) => getComputedStyle(element).getPropertyValue('--primary').trim()),
			).toBe('#4f46e5');
			const input = page.locator('[data-example="acme-theme"] input').first();
			expect(await input.evaluate((element) => element.getBoundingClientRect().height)).toBe(44);
		});
	});
});

describe('the layout page recipe', () => {
	test('its frame crosses the breakpoints of the theme when it is resized', async () => {
		const browser = await chromium.launch();
		try {
			const page = await browser.newPage({ viewport: { width: 1300, height: 900 } });
			await page.goto(`${baseUrl}/docs/examples/layout-page`, { waitUntil: 'networkidle' });
			const frame = page.locator('iframe.layout-page-demo');
			await pwExpect(frame).toBeVisible();
			const inFrame = page.frameLocator('iframe.layout-page-demo');
			await pwExpect(inFrame.locator('main')).toBeVisible();

			const left = async (tag: string) => (await inFrame.locator(tag).boundingBox())!.x;
			await frame.evaluate((element) => {
				element.style.maxWidth = 'none';
				element.style.width = '300px';
			});
			await pwExpect(inFrame.locator('nav')).toBeHidden();

			await frame.evaluate((element) => {
				element.style.width = '800px';
			});
			await pwExpect(inFrame.locator('nav')).toBeVisible();
			expect(await left('nav')).toBeLessThan(await left('main'));
			expect((await inFrame.locator('aside').boundingBox())!.x).toBe(await left('main'));

			await frame.evaluate((element) => {
				element.style.width = '1200px';
			});
			expect(await left('main')).toBeLessThan(await left('aside'));
		} finally {
			await browser.close();
		}
	});
});

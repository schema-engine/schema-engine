import { afterAll, beforeAll, describe, expect, inject, test } from 'vitest';
import { expect as pwExpect } from '@playwright/test';
import { chromium, type Browser, type BrowserContext, type Page } from 'playwright';

const baseUrl = inject('docsBaseUrl');

const STYLING_PAGES = [
	['/docs/styling/overview', 'Styling and layout'],
	['/docs/styling/layout-themes', 'Layout themes'],
	['/docs/styling/appearance-axes', 'Appearance axes'],
	['/docs/styling/theming', 'Theming'],
	['/docs/styling/recipes', 'Recipes'],
	['/docs/registry/registries', 'Registries and the catalog'],
] as const;

const RECIPE_IDS = [
	'contact-card',
	'address-form',
	'checkout-wizard',
	'drawn-layout',
	'brand-theme',
	'shared-theme',
	'tight-size',
	'brand-frame',
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
		await page.goto(`${baseUrl}/docs/styling/overview`, { waitUntil: 'networkidle' });
		const section = page.locator('a[href="/docs/styling/overview"]').first();
		await pwExpect(section).toBeAttached();
		for (const [path] of STYLING_PAGES.slice(0, 5)) {
			await pwExpect(page.locator(`a[href="${path}"]`).first()).toBeAttached();
		}
		await pwExpect(page.locator('a[href="/docs/registry/registries"]').first()).toBeAttached();
	});

	test('the llms exports carry the new pages', async () => {
		const index = await (await fetch(`${baseUrl}/llms.txt`)).text();
		expect(index).toContain('/docs-llm/styling/recipes.md');
		const markdown = await (await fetch(`${baseUrl}/docs-llm/styling/recipes.md`)).text();
		expect(markdown).toContain('A contact card with two half-width fields');
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
						`[data-recipe="${id}"] [data-renderer="${which}"] input[name$="${name}"]`,
					)!;
					const { x, y, width } = input.getBoundingClientRect();
					return { x, y, width };
				}),
			[recipe, names, renderer] as [string, string[], string],
		);
	}

	/** Selects each tab of a recipe, clicks its copy button and compares the clipboard with the text shown. */
	async function expectEveryTabCopies(id: string): Promise<void> {
		const tabsHost = page.locator(`[data-recipe="${id}"] radiant-code-tabs`);
		await tabsHost.scrollIntoViewIfNeeded();
		const tabs = tabsHost.getByRole('tab');
		const count = await tabs.count();
		expect(count, id).toBeGreaterThanOrEqual(3);
		for (let index = 0; index < count; index += 1) {
			const tab = tabs.nth(index);
			await tab.click();
			await pwExpect(tab).toHaveAttribute('aria-selected', 'true');
			const panel = tabsHost.getByRole('tabpanel').filter({ visible: true });
			const shown = await panel.locator('.code-tabs__code').textContent();
			await panel.locator('.code-tabs__copy').click();
			const copied = await page.evaluate(() => navigator.clipboard.readText());
			expect(copied, `${id} tab ${index}`).toBe(shown);
			expect(copied.length).toBeGreaterThan(40);
		}
	}

	describe('recipes page', () => {
		beforeAll(async () => {
			pageErrors.length = 0;
			await page.setViewportSize({ width: 1300, height: 900 });
			await page.goto(`${baseUrl}/docs/styling/recipes`, { waitUntil: 'networkidle' });
			await page.waitForFunction(() => {
				const form = document.querySelector('[data-recipe="brand-frame"] .docs-react-form-demo form');
				return form !== null && Object.keys(form).some((key) => key.startsWith('__react'));
			});
		});

		test('shows every recipe with a rendered demo', async () => {
			expect(await page.locator('[data-recipe]').count()).toBe(RECIPE_IDS.length);
			for (const id of RECIPE_IDS) {
				const demos = page.locator(`[data-recipe="${id}"] .recipe-demo__demo`);
				const count = await demos.count();
				expect(count, id).toBeGreaterThan(0);
				for (let index = 0; index < count; index += 1) {
					await pwExpect(demos.nth(index).locator('input').first(), id).toBeVisible();
				}
			}
		});

		test.each(['radiant', 'react'])('%s: a half-width pair shares a row and the rest fill it', async (renderer) => {
			const [first, last, email] = await rects('contact-card', ['first', 'last', 'email'], renderer);
			expect(first!.y).toBeCloseTo(last!.y, 0);
			expect(first!.width).toBeCloseTo(last!.width, 0);
			expect(email!.y).toBeGreaterThan(first!.y);
			expect(email!.width).toBeGreaterThan(first!.width * 1.9);
		});

		test('a fieldset places its children on its own grid', async () => {
			const [city, zip, region, country] = await rects('address-form', ['city', 'zip', 'region', 'country']);
			expect(city!.y).toBeCloseTo(zip!.y, 0);
			expect(city!.width).toBeGreaterThan(zip!.width * 1.8);
			expect(region!.y).toBeCloseTo(country!.y, 0);
			expect(region!.y).toBeGreaterThan(city!.y);
		});

		test('the drawn layout follows the breakpoint', async () => {
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
			const form = page.locator('[data-recipe="brand-theme"] rui-form.brand-form');
			await pwExpect(form).toHaveAttribute('data-se-tone', 'brand');
			expect(
				await form.evaluate((element) => getComputedStyle(element).getPropertyValue('--primary').trim()),
			).toBe('#c2410c');
		});

		test('two engines on one theme share its id and each picks its own tone', async () => {
			const forms = page.locator('[data-recipe="shared-theme"] rui-form');
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
			const demo = page.locator(`[data-recipe="tight-size"] [data-renderer="${renderer}"]`);
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
			for (const renderer of ['react', 'radiant']) {
				const demo = page.locator(`[data-recipe="brand-frame"] [data-renderer="${renderer}"]`);
				await pwExpect(demo.locator('.brand-frame__label')).toHaveText('Newsletter');
			}
		});

		test('every tab of every recipe copies the source it shows', async () => {
			for (const id of RECIPE_IDS) await expectEveryTabCopies(id);
		});

		test('the config tab is the config the demo renders', async () => {
			const root = page.locator('[data-recipe="contact-card"]');
			const rendered = JSON.parse(
				(await root.locator('se-form-instance').first().getAttribute('config')) ?? '{}',
			) as { id: string; steps: Array<{ elements: Array<{ id: string }> }> };
			const tab = root.getByRole('tab').first();
			await tab.click();
			const source = await root
				.getByRole('tabpanel')
				.filter({ visible: true })
				.locator('.code-tabs__code')
				.textContent();
			expect(source).toContain(`id: '${rendered.id}'`);
			for (const element of rendered.steps[0]!.elements) {
				expect(source).toContain(`id: '${element.id}'`);
			}
		});
	});

	test('the theming page renders its theme file demo', async () => {
		await page.goto(`${baseUrl}/docs/styling/theming`, { waitUntil: 'networkidle' });
		const form = page.locator('[data-recipe="acme-theme"] rui-form.acme');
		await pwExpect(form).toBeVisible();
		await pwExpect(page.locator('[data-recipe="acme-theme"] [data-se-size="comfortable"]').first()).toBeAttached();
		expect(await form.evaluate((element) => getComputedStyle(element).getPropertyValue('--primary').trim())).toBe(
			'#4f46e5',
		);
		const input = page.locator('[data-recipe="acme-theme"] input').first();
		expect(await input.evaluate((element) => element.getBoundingClientRect().height)).toBe(44);
		await expectEveryTabCopies('acme-theme');
	});
});

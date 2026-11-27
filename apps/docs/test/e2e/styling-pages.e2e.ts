import { afterAll, beforeAll, describe, expect, inject, test } from 'vitest';
import { expect as pwExpect } from '@playwright/test';
import { chromium, type Browser, type BrowserContext, type Page } from 'playwright';

const baseUrl = inject('docsBaseUrl');

const STYLING_PAGES = [
	['/docs/layout/overview', 'Layout'],
	['/docs/layout/layout-themes', 'Layout themes'],
	['/docs/layout/appearance-axes', 'Appearance axes'],
	['/docs/layout/theming', 'Theming'],
	['/docs/examples/theming', 'A themed form'],
	['/docs/registry/registries', 'Read-only and mutable registries'],
] as const;

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
		expect(index).toContain('/docs-llm/examples/theming.md');
		const markdown = await (await fetch(`${baseUrl}/docs-llm/examples/theming.md`)).text();
		expect(markdown).toContain('Two `half` fields share a row');
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

	/** Opens the page of the themed form example, wide enough to show both renderers, and waits until React has hydrated. */
	async function openExample(): Promise<void> {
		pageErrors.length = 0;
		await page.setViewportSize({ width: 1700, height: 900 });
		await page.goto(`${baseUrl}/docs/examples/theming`, { waitUntil: 'networkidle' });
		await page.waitForFunction(() => {
			const form = document.querySelector('.docs-react-form-demo form');
			return form !== null && Object.keys(form).some((key) => key.startsWith('__react'));
		});
	}

	describe('the themed form example page', () => {
		test('renders each of its demos on a page without script errors', async () => {
			await openExample();
			const demos = page.locator('[data-example] .example-demo__demo');
			const count = await demos.count();
			expect(count).toBe(2);
			for (let index = 0; index < count; index += 1) {
				await pwExpect(demos.nth(index).locator('input').first()).toBeVisible();
			}
			expect(pageErrors).toEqual([]);
		});

		test.each(['radiant', 'react'])('%s: a half-width pair shares a row and the rest fill it', async (renderer) => {
			await openExample();
			const [first, last, email] = await rects('themed', ['first', 'last', 'email'], renderer);
			expect(first!.y).toBeCloseTo(last!.y, 0);
			expect(first!.width).toBeCloseTo(last!.width, 0);
			expect(email!.y).toBeGreaterThan(first!.y);
			expect(email!.width).toBeGreaterThan(first!.width * 1.9);
		});

		test('the tone axis writes its attribute and sets the colour roles', async () => {
			await openExample();
			const form = page.locator('[data-example="themed"] [data-renderer="radiant"] rui-form.themed');
			await pwExpect(form).toHaveAttribute('data-se-tone', 'brand');
			expect(
				await form.evaluate((element) => getComputedStyle(element).getPropertyValue('--primary').trim()),
			).toBe('#c2410c');
		});

		test('both renderers run on one theme', async () => {
			await openExample();
			const themesOf = (renderer: string) =>
				page
					.locator(`[data-example="themed"] [data-renderer="${renderer}"] [data-se-theme]`)
					.evaluateAll((elements) => [
						...new Set(elements.map((element) => element.getAttribute('data-se-theme'))),
					]);
			const [react, radiant] = [await themesOf('react'), await themesOf('radiant')];
			expect(react).toHaveLength(1);
			expect(radiant).toHaveLength(1);
			expect(react).toEqual(radiant);
		});

		test.each([
			['radiant', '.card-shell__section'],
			['react', '.se-demo-card__section'],
		])(
			'%s: the size hooks set on the form class reach the compact card and its controls',
			async (renderer, card) => {
				await openExample();
				const demo = page.locator(`[data-example="themed"] [data-renderer="${renderer}"]`);
				expect(
					await demo
						.locator(card)
						.first()
						.evaluate((element) => getComputedStyle(element).paddingTop),
				).toBe('12px');
				expect(
					await demo
						.locator('input')
						.first()
						.evaluate((element) => element.getBoundingClientRect().height),
				).toBe(28);
			},
		);
	});
});

describe('the layout page example', () => {
	test('its frame shows the three-column layout of a desktop, shrunk to the column, and crosses the breakpoints of the theme at the narrower widths', async () => {
		const browser = await chromium.launch();
		try {
			const page = await browser.newPage({ viewport: { width: 1300, height: 900 } });
			await page.goto(`${baseUrl}/docs/examples/layout-page`, { waitUntil: 'networkidle' });
			const demo = page.locator('.layout-page-demo');
			const frame = demo.locator('iframe');
			await pwExpect(frame).toBeVisible();
			const inFrame = page.frameLocator('.layout-page-demo iframe');
			await pwExpect(inFrame.locator('main')).toBeVisible();

			const left = async (tag: string) => (await inFrame.locator(tag).boundingBox())!.x;
			const widthOf = async () => (await frame.boundingBox())!.width;
			const columnWidth = async () => (await demo.boundingBox())!.width;
			/**
			 * How far the scaled frame is from the width of its column, in either direction.
			 *
			 * @remarks
			 * The demo script rescales the frame from a ResizeObserver, after the column has already resized, so a
			 * check that the frame is no wider than the column holds both when it fits and while it still has the
			 * scale of a wider column. Only a fit to the column's current width shows the script has run.
			 */
			const misfit = async () => Math.abs((await widthOf()) - (await columnWidth()));
			await pwExpect(inFrame.locator('nav')).toBeVisible();
			expect(await left('nav')).toBeLessThan(await left('main'));
			expect(await left('main')).toBeLessThan(await left('aside'));
			expect(await frame.evaluate((element) => getComputedStyle(element).width)).toBe('1200px');
			await pwExpect.poll(misfit).toBeLessThan(1);

			const pageHeight = () =>
				inFrame.locator('html').evaluate((element) => element.getBoundingClientRect().height);
			await pwExpect
				.poll(async () => (await frame.boundingBox())!.height)
				.toBeCloseTo((await pageHeight()) * ((await widthOf()) / 1200), 0);

			const wide = await widthOf();
			await page.setViewportSize({ width: 900, height: 900 });
			await pwExpect.poll(widthOf).toBeLessThan(wide);
			await pwExpect.poll(misfit).toBeLessThan(1);
			await page.setViewportSize({ width: 1300, height: 900 });
			await pwExpect.poll(widthOf).toBeCloseTo(wide, 0);
			await pwExpect.poll(misfit).toBeLessThan(1);

			await demo.getByLabel('Tablet 900px').check();
			await pwExpect
				.poll(async () => (await inFrame.locator('aside').boundingBox())!.x - (await left('main')))
				.toBe(0);
			expect(await left('nav')).toBeLessThan(await left('main'));

			await demo.getByLabel('Phone 400px').check();
			await pwExpect(inFrame.locator('nav')).toBeHidden();
			await pwExpect.poll(widthOf).toBeCloseTo(400, 0);
		} finally {
			await browser.close();
		}
	});
});

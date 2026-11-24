import { afterEach, describe, expect, test } from 'vitest';
import { page as browserPage } from 'vitest/browser';
import { renderPage } from './host';
import { dashboard } from './page';
import { theme } from './theme';

afterEach(() => document.body.replaceChildren());

/** Mounts the page the way an app would: the stylesheet once, then the markup. */
function mount(width: number) {
	const style = document.createElement('style');
	style.textContent = theme.css;
	const host = document.createElement('div');
	host.style.width = `${width}px`;
	host.innerHTML = renderPage(dashboard);
	document.body.append(style, host);
	const box = (tag: string) => host.querySelector(tag)!.getBoundingClientRect();
	const shown = (tag: string) => getComputedStyle(host.querySelector(tag)!).display !== 'none';
	return { box, shown, cleanup: () => style.remove() };
}

describe('the laid out page', () => {
	afterEach(async () => {
		await browserPage.viewport(414, 896);
	});

	test('is one column on a phone, with the navigation hidden', async () => {
		await browserPage.viewport(400, 900);
		const { box, shown, cleanup } = mount(400);

		expect(shown('nav')).toBe(false);
		expect(box('header').top).toBeLessThan(box('main').top);
		expect(box('main').top).toBeLessThan(box('aside').top);
		expect(box('aside').top).toBeLessThan(box('footer').top);
		expect(box('main').left).toBe(box('aside').left);
		cleanup();
	});

	test('puts the navigation beside main and the aside under it from md', async () => {
		await browserPage.viewport(800, 900);
		const { box, shown, cleanup } = mount(800);

		expect(shown('nav')).toBe(true);
		expect(box('nav').left).toBeLessThan(box('main').left);
		expect(box('nav').top).toBe(box('main').top);
		expect(box('aside').top).toBeGreaterThan(box('main').top);
		expect(box('aside').left).toBe(box('main').left);
		cleanup();
	});

	test('puts main and the aside side by side from lg', async () => {
		await browserPage.viewport(1200, 900);
		const { box, cleanup } = mount(1200);

		expect(box('nav').left).toBeLessThan(box('main').left);
		expect(box('main').left).toBeLessThan(box('aside').left);
		expect(box('aside').top).toBe(box('main').top);
		expect(box('footer').top).toBeGreaterThan(box('main').bottom - 1);
		cleanup();
	});
});

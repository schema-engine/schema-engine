import { afterEach, expect, test } from 'vitest';
import { createRoot } from '@ecopages/jsx/client';
import { HeroShell } from '@/components/shells';

afterEach(() => document.body.replaceChildren());

function mountHero(shell: Record<string, unknown>) {
	const host = document.createElement('div');
	document.body.append(host);
	createRoot(host).render(HeroShell({ slots: {}, viewConfig: { shell: { contentWidth: 'md', ...shell } } }));
	return host;
}

test('resolves a background image URL containing spaces, parentheses and quotes', async () => {
	for (const path of ['/assets/hero image (1).jpg', `/assets/it's "here".jpg`]) {
		const host = mountHero({ backgroundImage: path });
		await expect.poll(() => host.querySelector('.hero-shell')).toBeTruthy();
		const expected = new URL(path, document.baseURI).href;

		expect(getComputedStyle(host.querySelector('.hero-shell')!).backgroundImage).toBe(`url("${expected}")`);
		host.remove();
	}
});

test('plays the background video inline and leaves the container type to the browser', async () => {
	const host = mountHero({ backgroundVideo: '/hero.webm' });
	await expect.poll(() => host.querySelector('video')).toBeTruthy();
	const video = host.querySelector('video')!;

	expect(video.playsInline).toBe(true);
	expect(video.getAttribute('src')).toBe('/hero.webm');
	expect(video.querySelector('source')).toBeNull();
});

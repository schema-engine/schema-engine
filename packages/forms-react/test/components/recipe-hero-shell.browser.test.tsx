import { render } from '@testing-library/react';
import { describe, expect, test } from 'vitest';
import { HeroShell } from '@/components/schema-engine/forms/recipes/shells/hero-shell';
import '@/components/schema-engine/forms/recipes/recipes.css';

function renderHero(shell: Record<string, unknown>) {
	const { container } = render(
		<HeroShell slots={{ content: <p>content</p> }} viewConfig={{ shell: { contentWidth: 'md', ...shell } }} />,
	);
	return container.firstElementChild as HTMLElement;
}

describe('hero shell', () => {
	test('layers the video above the shell background and below the overlay and content', () => {
		const root = renderHero({ backgroundVideo: '/hero.webm' });
		const video = root.querySelector('video') as HTMLVideoElement;
		const overlay = root.querySelector('.se-hero-shell__overlay') as HTMLElement;
		const content = root.querySelector('.se-hero-shell__content') as HTMLElement;

		expect(getComputedStyle(root).isolation).toBe('isolate');
		expect(getComputedStyle(video).zIndex).toBe('0');
		expect(getComputedStyle(overlay).zIndex).toBe('1');
		expect(getComputedStyle(content).zIndex).toBe('2');
	});

	test('plays the video inline from its src without a declared type', () => {
		const video = renderHero({ backgroundVideo: '/hero.webm' }).querySelector('video') as HTMLVideoElement;

		expect(video.playsInline).toBe(true);
		expect(video.muted).toBe(true);
		expect(video.getAttribute('src')).toBe('/hero.webm');
		expect(video.querySelector('source')).toBeNull();
	});

	test('resolves a background image URL containing spaces, parentheses and quotes', () => {
		for (const path of ['/assets/hero image (1).jpg', `/assets/it's "here".jpg`]) {
			const root = renderHero({ backgroundImage: path });
			const expected = new URL(path, document.baseURI).href;

			expect(getComputedStyle(root).backgroundImage).toBe(`url("${expected}")`);
		}
	});

	test('keeps an authored value inside the url string', () => {
		const root = renderHero({ backgroundImage: 'x"); color: red; background: url("y' });

		expect(root.style.color).toBe('');
		expect(getComputedStyle(root).backgroundImage).toContain('x%22)');
	});

	test('keeps the background image as data and the layout in the stylesheet', () => {
		const root = renderHero({ backgroundImage: '/hero.jpg' });

		expect(root.style.backgroundImage).toContain('/hero.jpg');
		expect(root.style.length).toBe(1);
		expect(getComputedStyle(root).backgroundSize).toBe('cover');
	});
});

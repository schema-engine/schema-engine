import { render } from '@testing-library/react';
import { describe, expect, test } from 'vitest';
import { HeroShell } from '@/components/schema-engine/forms/recipes/shells/hero-shell';

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
		const overlay = root.querySelector('div.bg-black\\/50') as HTMLElement;
		const content = root.querySelector('p')?.closest('div.relative') as HTMLElement;

		expect(root).toHaveClass('isolate');
		expect(video).toHaveClass('z-0');
		expect(overlay).toHaveClass('z-1');
		expect(content).toHaveClass('z-2');
		expect(video).not.toHaveClass('-z-10');
	});

	test('plays the video inline and does not declare a container type', () => {
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
	});
});

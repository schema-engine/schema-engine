import { render } from '@testing-library/react';
import { afterEach, describe, expect, test } from 'vitest';
import { createFormEngine } from '@schema-engine/forms';
import { CardShell } from '@/components/schema-engine/forms/recipes/shells/card-shell';
import '@/components/schema-engine/forms/recipes/recipes.css';

const layout = createFormEngine().getLayout();

afterEach(() => {
	document.head.querySelectorAll('style[data-card-shell-test]').forEach((style) => style.remove());
});

/**
 * Mounts the card shell inside a themed scope with the engine's token stylesheet in the head.
 *
 * @remarks The tokens (`--se-space`, `--se-border-width`, ...) are declared by the layout theme for the
 * attribute values, so the scope carries `data-se-theme` and the stylesheet is loaded.
 */
function mountCard(pick?: Record<string, string>, extraCss = '') {
	const style = document.createElement('style');
	style.dataset.cardShellTest = '';
	style.textContent = `${layout.css}\n${extraCss}`;
	document.head.append(style);
	const view = render(
		<div data-se-theme={layout.id} style={{ width: '1200px' }}>
			<CardShell
				slots={{ header: 'Header', content: 'Content' }}
				viewConfig={{ shell: pick ? { appearance: pick } : {} }}
			/>
		</div>,
	);
	const card = view.container.querySelector<HTMLElement>('.se-card-shell__card');
	if (!card) throw new Error('The card shell rendered no card.');
	const content = view.container.querySelector<HTMLElement>('.se-card-shell__content');
	if (!content) throw new Error('The card shell rendered no content section.');
	return { card, content, scope: view.container, style: getComputedStyle(card) };
}

describe('card shell stylesheet', () => {
	test('an unpicked card keeps the default spacing and width', () => {
		const { card, content, style } = mountCard();
		expect(getComputedStyle(content).paddingTop).toBe('24px');
		expect(card.getBoundingClientRect().width).toBe(448);
		expect(style.borderTopWidth).toBe('1px');
		expect(style.boxShadow).not.toBe('none');
	});

	test.each([
		['compact', '16px', 384],
		['default', '24px', 448],
		['comfortable', '32px', 512],
	])('size %s sets the section padding and the card width', (size, padding, width) => {
		const { card, content } = mountCard({ size });
		expect(getComputedStyle(content).paddingTop).toBe(padding);
		expect(card.getBoundingClientRect().width).toBe(width);
	});

	test.each([
		['flat', '0px', true],
		['outlined', '1px', true],
		['elevated', '1px', false],
	])('surface %s sets the card border and shadow', (surface, border, noShadow) => {
		const { style } = mountCard({ surface });
		expect(style.borderTopWidth).toBe(border);
		expect(style.boxShadow === 'none').toBe(noShadow);
	});

	test('the header section follows the same spacing as the content section', () => {
		const { card } = mountCard({ size: 'comfortable' });
		const header = card.querySelector<HTMLElement>('.se-card-shell__header');
		expect(header && getComputedStyle(header).paddingTop).toBe('32px');
	});

	test('a host class on a section outranks the stylesheet', () => {
		const { content } = mountCard({ size: 'comfortable' }, '.host-padding { padding: 3px; }');
		expect(getComputedStyle(content).paddingTop).toBe('32px');
		content.classList.add('host-padding');
		expect(getComputedStyle(content).paddingTop).toBe('3px');
	});

	test('a host class on the card outranks the stylesheet width and shadow', () => {
		const { card } = mountCard({ surface: 'elevated' }, '.host-card { max-width: 10rem; box-shadow: none; }');
		card.classList.add('host-card');
		expect(card.getBoundingClientRect().width).toBe(160);
		expect(getComputedStyle(card).boxShadow).toBe('none');
	});

	test('the card renders no inline styles', () => {
		const { scope } = mountCard({ size: 'comfortable' });
		expect(scope.querySelectorAll('[data-se-theme] [style]')).toHaveLength(0);
	});
});

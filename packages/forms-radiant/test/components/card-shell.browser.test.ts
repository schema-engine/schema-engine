import { afterEach, expect, test } from 'vitest';
import { createRoot } from '@ecopages/jsx/client';
import { createFormEngine } from '@schema-engine/forms';
import { CardShell } from '@/components/shells';
import '@/components/shells/card-shell.css';

const layout = createFormEngine().getLayout();

afterEach(() => {
	document.body.replaceChildren();
	document.head.querySelectorAll('style[data-card-shell-test]').forEach((style) => style.remove());
});

/**
 * Mounts the card shell inside a form-like scope and the engine's token stylesheet.
 *
 * @remarks The shell reads `--se-size-*` and `--se-surface-*`; the engine declares them for the
 * attribute values, so the scope carries `data-se-theme` and the stylesheet is in the head.
 */
function mountCard(pick?: Record<string, string>) {
	const style = document.createElement('style');
	style.dataset.cardShellTest = '';
	style.textContent = layout.css;
	document.head.append(style);
	const scope = document.createElement('div');
	scope.dataset.seTheme = layout.id;
	scope.style.width = '1200px';
	document.body.append(scope);
	createRoot(scope).render(
		CardShell({
			slots: { header: 'Header', progress: null, content: 'Content', actions: null },
			viewConfig: { shell: pick ? { appearance: pick } : {} },
			meta: { id: 'card', title: 'Card' },
		} as unknown as Parameters<typeof CardShell>[0]),
	);
	return scope;
}

async function card(pick?: Record<string, string>) {
	const scope = mountCard(pick);
	await expect.poll(() => scope.querySelector('.card-shell__card')).toBeTruthy();
	const element = scope.querySelector<HTMLElement>('.card-shell__card')!;
	return {
		element,
		style: getComputedStyle(element),
		sectionPadding: getComputedStyle(scope.querySelector('.card-shell__content')!).paddingTop,
		width: element.getBoundingClientRect().width,
	};
}

test('an unpicked card keeps the themed spacing and the default width', async () => {
	const unpicked = await card();
	expect(unpicked.sectionPadding).toBe('24px');
	expect(unpicked.width).toBe(448);
	expect(unpicked.style.borderTopWidth).toBe('1px');
	expect(unpicked.style.boxShadow).not.toBe('none');
});

test('size default equals no pick', async () => {
	const unpicked = await card();
	document.body.replaceChildren();
	const picked = await card({ size: 'default' });
	expect(picked.sectionPadding).toBe(unpicked.sectionPadding);
	expect(picked.width).toBe(unpicked.width);
});

test.each([
	['compact', '16px', 384],
	['comfortable', '32px', 512],
])('size %s sets the card padding and width', async (size, padding, width) => {
	const picked = await card({ size });
	expect(picked.sectionPadding).toBe(padding);
	expect(picked.width).toBe(width);
});

test.each([
	['flat', '0px', true],
	['outlined', '1px', true],
	['elevated', '1px', false],
])('surface %s sets the card border and shadow', async (surface, border, flatShadow) => {
	const picked = await card({ surface });
	expect(picked.style.borderTopWidth).toBe(border);
	expect(picked.style.boxShadow === 'none').toBe(flatShadow);
});

test('an engine whose host sets the theme spacing is followed by the size tokens', async () => {
	document.documentElement.style.setProperty('--space-block-lg', '40px');
	try {
		const themed = await card({ size: 'default' });
		expect(themed.sectionPadding).toBe('40px');
	} finally {
		document.documentElement.style.removeProperty('--space-block-lg');
	}
});

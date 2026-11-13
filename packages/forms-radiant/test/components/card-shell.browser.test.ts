import { afterEach, expect, test } from 'vitest';
import { createRoot } from '@ecopages/jsx/client';
import { createFormEngine } from '@schema-engine/forms';
import { CardShell } from '@/components/shells';
import '@/styles/appearance.css';
import '@/components/shells/card-shell.css';

const layout = createFormEngine().getLayout();

afterEach(() => {
	document.body.replaceChildren();
	document.head.querySelectorAll('style[data-card-shell-test]').forEach((style) => style.remove());
});

/**
 * Mounts the card shell inside a form-like scope and the engine's token stylesheet.
 *
 * @remarks The shell reads the semantic tokens (`--se-space`, `--se-border-width`, `--se-shadow`); the engine declares them for the
 * attribute values, so the scope carries `data-se-theme` and the stylesheet is in the head.
 */
function mountCard(pick?: Record<string, string>, outerSize?: string) {
	const style = document.createElement('style');
	style.dataset.cardShellTest = '';
	style.textContent = layout.css;
	document.head.append(style);
	const scope = document.createElement('div');
	scope.dataset.seTheme = layout.id;
	scope.style.width = '1200px';
	if (outerSize) scope.dataset.seSize = outerSize;
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

async function card(pick?: Record<string, string>, outerSize?: string) {
	const scope = mountCard(pick, outerSize);
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

test('size default undoes a compact pick it inherits', async () => {
	const compact = await card(undefined, 'compact');
	expect(compact.sectionPadding).toBe('16px');
	document.body.replaceChildren();
	const reset = await card({ size: 'default' }, 'compact');
	expect(reset.sectionPadding).toBe('24px');
	expect(reset.width).toBe(448);
});

/**
 * Sets host theme variables on the document for one test and returns how to remove them.
 *
 * @remarks The variables are the ones a Radiant theme sets; the layout theme's tokens must follow them.
 */
function setHostTheme(variables: Record<string, string>) {
	for (const [name, value] of Object.entries(variables)) document.documentElement.style.setProperty(name, value);
	return () => {
		for (const name of Object.keys(variables)) document.documentElement.style.removeProperty(name);
	};
}

test.each([
	['compact', '12px', 384],
	['default', '24px', 448],
	['comfortable', '56px', 512],
])('size %s follows the host theme spacing and keeps its width', async (size, padding, width) => {
	const restore = setHostTheme({ '--space-4': '12px', '--space-6': '24px', '--space-8': '56px' });
	try {
		const picked = await card({ size });
		expect(picked.sectionPadding).toBe(padding);
		expect(picked.width).toBe(width);
	} finally {
		restore();
	}
});

test.each(['flat', 'outlined', 'elevated'])('surface %s keeps the themed card background', async (surface) => {
	const restore = setHostTheme({ '--surface': 'rgb(1, 2, 3)' });
	try {
		const picked = await card({ surface });
		expect(picked.style.backgroundColor).toBe('rgb(1, 2, 3)');
	} finally {
		restore();
	}
});

test('an explicit surface elevated pick looks like no pick under a themed shadow colour', async () => {
	const restore = setHostTheme({ '--on-surface': 'rgb(255, 0, 0)' });
	try {
		const unpicked = await card();
		const expected = { shadow: unpicked.style.boxShadow, border: unpicked.style.borderTopWidth };
		document.body.replaceChildren();
		const picked = await card({ surface: 'elevated' });
		expect(picked.style.boxShadow).toBe(expected.shadow);
		expect(picked.style.borderTopWidth).toBe(expected.border);
		expect(picked.style.boxShadow).not.toBe('none');
	} finally {
		restore();
	}
});

test('an engine whose host sets the theme spacing is followed by the size tokens', async () => {
	document.documentElement.style.setProperty('--space-6', '40px');
	try {
		const themed = await card({ size: 'default' });
		expect(themed.sectionPadding).toBe('40px');
	} finally {
		document.documentElement.style.removeProperty('--space-6');
	}
});

import { render } from '@testing-library/react';
import type { ComponentType, ReactNode } from 'react';
import { afterEach, describe, expect, test } from 'vitest';
import { createFormEngine } from '@schema-engine/forms';
import type { FormShellProps } from '@schema-engine/forms-react/primitives';
import { HeroShell } from '@/components/schema-engine/forms/recipes/shells/hero-shell';
import { SidebarShell } from '@/components/schema-engine/forms/recipes/shells/sidebar-shell';
import { StackShell } from '@/components/schema-engine/forms/recipes/shells/stack-shell';
import '@/components/schema-engine/forms/recipes/recipes.css';

const layout = createFormEngine().getLayout();

afterEach(() => {
	document.head.querySelectorAll('style[data-shell-style-test]').forEach((style) => style.remove());
});

/**
 * Mounts a shell inside a themed scope with the engine's token stylesheet in the head.
 *
 * @remarks
 * The host CSS goes before every other stylesheet, so a host rule beats a recipe rule only by specificity,
 * which is what `:where()` guarantees; a recipe rule with a specificity of its own would win on source order.
 */
function mountShell(Shell: ComponentType<FormShellProps>, root: string, pick?: string, hostCss = '') {
	const style = document.createElement('style');
	style.dataset.shellStyleTest = '';
	style.textContent = `${layout.css}\n${hostCss}`;
	document.head.prepend(style);
	const slots: Record<string, ReactNode> = { header: 'Header', content: 'Content', actions: 'Actions' };
	const view = render(
		<div data-se-theme={layout.id} style={{ width: '1200px' }}>
			<Shell slots={slots} viewConfig={{ shell: pick ? { appearance: { size: pick } } : {} }} meta={undefined} />
		</div>,
	);
	const element = view.container.querySelector<HTMLElement>(root);
	if (!element) throw new Error(`The shell rendered no ${root}.`);
	return getComputedStyle(element);
}

describe('hero shell stylesheet', () => {
	test.each([
		['compact', '16px'],
		['comfortable', '32px'],
	])('size %s sets its padding from --se-space', (size, padding) => {
		expect(mountShell(HeroShell, '.se-hero-shell', size).paddingTop).toBe(padding);
	});

	test('an unpicked hero keeps the default padding', () => {
		expect(mountShell(HeroShell, '.se-hero-shell').paddingTop).toBe('32px');
	});

	test('a host class sets the padding and wins', () => {
		const style = mountShell(HeroShell, '.se-hero-shell', 'compact', '.se-hero-shell { padding: 7px; }');
		expect(style.paddingTop).toBe('7px');
	});
});

describe('sidebar shell stylesheet', () => {
	test('size compact gaps its slots from --se-space', () => {
		expect(mountShell(SidebarShell, '.se-sidebar-shell', 'compact').rowGap).toBe('16px');
	});

	test('a host class sets the gap and wins', () => {
		const style = mountShell(SidebarShell, '.se-sidebar-shell', 'compact', '.se-sidebar-shell { gap: 7px; }');
		expect(style.rowGap).toBe('7px');
	});
});

describe('stack shell stylesheet', () => {
	test('lays its slots in a column with the unpicked gap', () => {
		const style = mountShell(StackShell, '.se-stack-shell');
		expect(style.flexDirection).toBe('column');
		expect(style.rowGap).toBe('24px');
	});

	test('a host class sets the gap and wins', () => {
		expect(mountShell(StackShell, '.se-stack-shell', undefined, '.se-stack-shell { gap: 7px; }').rowGap).toBe(
			'7px',
		);
	});
});

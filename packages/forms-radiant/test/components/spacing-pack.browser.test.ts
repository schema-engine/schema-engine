import '@ecopages/radiant-ui/radiant-ui-core.css';
import '@ecopages/radiant-ui/themes/default';
import '@ecopages/radiant-ui/styles.css';
import '@/styles/appearance.css';
import '@/components/shells/card-shell.css';
import compactPack from '@ecopages/radiant-ui/tokens/spacing/compact?inline';
import { afterEach, expect, test } from 'vitest';
import { createRoot } from '@ecopages/jsx/client';
import { createFormEngine } from '@schema-engine/forms';
import { CardShell } from '@/components/shells';

const layout = createFormEngine().getLayout();

afterEach(() => {
	document.body.replaceChildren();
	document.head.querySelectorAll('style[data-spacing-pack-test]').forEach((style) => style.remove());
});

function addStyle(css: string) {
	const style = document.createElement('style');
	style.dataset.spacingPackTest = '';
	style.textContent = css;
	document.head.append(style);
}

/**
 * Mounts a card shell under the engine's token stylesheet and reads the padding its content section resolves to.
 *
 * @remarks The padding is `--se-space` on a pick, so it is the spacing the size axis hands the shell.
 */
async function contentPadding(pick?: Record<string, string>) {
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
	await expect.poll(() => scope.querySelector('.card-shell__content')).toBeTruthy();
	return getComputedStyle(scope.querySelector('.card-shell__content')!).paddingTop;
}

test.each([
	['compact', '12px'],
	['comfortable', '24px'],
	['default', '20px'],
])('size %s follows the compact spacing pack', async (size, padding) => {
	addStyle(layout.css);
	addStyle(compactPack);
	expect(await contentPadding({ size })).toBe(padding);
});

import { createRouter } from '@ecopages/browser-router/client';
import { isServer } from '@ecopages/radiant/is-server';
import { installPreviewEngineBinding } from '@/lib/preview-engine-binding';
import { installDocsToastShell } from '@/lib/docs-toast-shell';

const BASE_LAYOUT_CLIENT = Symbol.for('@schema-engine/docs.base-layout-client');

const CODE_COPY_SELECTOR = '[data-rehype-pretty-copy]';
const CODE_COPY_FEEDBACK_MS = 1200;

async function copyTextToClipboard(text: string): Promise<void> {
	if (navigator.clipboard?.writeText) {
		await navigator.clipboard.writeText(text);
		return;
	}

	const textarea = document.createElement('textarea');
	textarea.value = text;
	textarea.setAttribute('readonly', '');
	textarea.style.position = 'fixed';
	textarea.style.opacity = '0';
	document.body.append(textarea);
	textarea.select();
	document.execCommand('copy');
	textarea.remove();
}

function setCodeCopyFeedback(button: HTMLButtonElement, isError = false): void {
	button.dataset.copyError = String(isError);
	button.textContent = isError ? 'Try again' : 'Copied';
	button.setAttribute('aria-label', isError ? 'Could not copy code' : 'Code copied to clipboard');

	window.setTimeout(() => {
		button.removeAttribute('data-copy-error');
		button.textContent = 'Copy';
		button.setAttribute('aria-label', 'Copy code');
	}, CODE_COPY_FEEDBACK_MS);
}

/**
 * Delegated handler for fenced-code copy buttons.
 *
 * @remarks
 * Lives in the base layout so code blocks copy on every page, not only inside the docs layout.
 * The button's `aria-label` carries the feedback for assistive technology.
 */
function installCodeCopyHandler(): void {
	document.addEventListener('click', (event) => {
		const target = event.target instanceof Element ? event.target.closest(CODE_COPY_SELECTOR) : null;
		if (!(target instanceof HTMLButtonElement)) return;

		const source = target.dataset.rehypePrettyCopy;
		if (!source) return;

		void copyTextToClipboard(source)
			.then(() => setCodeCopyFeedback(target))
			.catch(() => setCodeCopyFeedback(target, true));
	});
}

function installBaseLayoutClient(): void {
	if (isServer || typeof document === 'undefined' || BASE_LAYOUT_CLIENT in document) {
		return;
	}

	Reflect.set(document, BASE_LAYOUT_CLIENT, true);
	installDocsToastShell();
	installPreviewEngineBinding();
	installCodeCopyHandler();
	createRouter();
}

installBaseLayoutClient();

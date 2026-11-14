/**
 * Registers the Radiant UI custom elements rendered by the docs shell.
 *
 * @remarks
 * Keep this file outside any `layouts` or `pages` folder. On `@ecopages/react` 0.8.0 a bug
 * drops bare side-effect imports from modules under those folders (ecopages/ecopages#1195),
 * which left `rui-toc`, `rui-sidebar` and `rui-breadcrumb` undefined in the production build.
 * It can move back next to the layout once a release with the fix is installed.
 */
/* oxlint-disable import/no-unassigned-import -- custom-element side effects */
import '@ecopages/radiant-ui/alert';
import '@ecopages/radiant-ui/breadcrumb';
import '@ecopages/radiant-ui/sidebar';
import '@ecopages/radiant-ui/toc';
import '@ecopages/radiant-ui/toast';
/* oxlint-enable import/no-unassigned-import */

import { isServer } from '@ecopages/radiant/is-server';
import { installPreviewEngineBinding } from '@/lib/preview-engine-binding';
import { installDocsToastShell } from '@/lib/docs-toast-shell';

const docsContentSelector = '.docs-layout__content';
const DOCS_LAYOUT_CLIENT = Symbol.for('@schema-engine/docs.layout-client');

type DocsNavigationEvent = CustomEvent<{ url: URL }>;

function scrollDocsToTop(): void {
	document.querySelector<HTMLElement>(docsContentSelector)?.scrollTo({ top: 0, left: 0, behavior: 'instant' });
}

function onDocsLayoutAfterSwap(event: Event): void {
	const { url } = (event as DocsNavigationEvent).detail;
	if (url.hash) {
		return;
	}

	scrollDocsToTop();
}

/** @remarks Skipped during SSR and when the entry script re-evaluates (HMR). */
function installDocsLayoutClient(): void {
	if (isServer || typeof document === 'undefined' || DOCS_LAYOUT_CLIENT in document) {
		return;
	}

	Reflect.set(document, DOCS_LAYOUT_CLIENT, true);
	installDocsToastShell();
	installPreviewEngineBinding();
	document.addEventListener('eco:after-swap', onDocsLayoutAfterSwap);
}

installDocsLayoutClient();

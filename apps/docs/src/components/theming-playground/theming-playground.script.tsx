/** @jsxImportSource @ecopages/jsx */
import { createRoot, type JsxRoot } from '@ecopages/jsx/client';
import type { FormConfig } from '@schema-engine/forms';
import { FormRenderer } from '@schema-engine/forms-radiant';
import { formEngine } from '@/lib/form-engine-setup';
import { applyPicks, describePicks, readPicks, shufflePicks } from './picks';

/**
 * @remarks
 * Restyles the two demos of a themed form playground on each Shuffle. Each renderer is driven through its own way of
 * rendering a config, never by writing `data-se-*` attributes into the form:
 *
 * - React: the demo root's `data-se-form-config` is the config its client script renders, and that script renders the
 *   new value into the React root it already holds, so this script only writes the attribute.
 * - Radiant: the preview's host is rendered again with `FormRenderer` and the new config, through the Radiant JSX
 *   `createRoot`, which replaces the server-rendered form.
 *
 * Every shuffle lays new picks over the config of the page and writes them into the status line. A new config starts a
 * new form in each renderer, so what a visitor typed is cleared when the style changes. The script runs on the first
 * load and after each client-side navigation.
 */
const PLAYGROUND_SELECTOR = '[data-theming-playground]';
const REACT_CONFIG_ATTR = 'data-se-form-config';

const initialized = new WeakSet<Element>();
const radiantRoots = new WeakMap<Element, JsxRoot>();

function renderRadiant(playground: HTMLElement, config: FormConfig): void {
	const host = playground.querySelector<HTMLElement>('.docs-form-renderer-preview');
	if (!host) return;
	let root = radiantRoots.get(host);
	if (!root) {
		root = createRoot(host);
		radiantRoots.set(host, root);
	}
	root.unmount();
	root.render(<FormRenderer engine={formEngine} config={config} />);
}

function setUp(playground: HTMLElement): void {
	if (initialized.has(playground)) return;
	initialized.add(playground);
	const base = JSON.parse(playground.dataset.themingPlayground ?? 'null') as FormConfig;
	let picks = readPicks(base);

	playground.querySelector('[data-shuffle]')?.addEventListener('click', () => {
		picks = shufflePicks(picks);
		const config = applyPicks(base, picks);
		playground.querySelector('.docs-react-form-demo')?.setAttribute(REACT_CONFIG_ATTR, JSON.stringify(config));
		renderRadiant(playground, config);
		const status = playground.querySelector('[data-status]');
		if (status) status.textContent = describePicks(picks);
	});
}

function setUpPlaygrounds(): void {
	for (const playground of document.querySelectorAll<HTMLElement>(PLAYGROUND_SELECTOR)) setUp(playground);
}

setUpPlaygrounds();
document.addEventListener('eco:page-load', setUpPlaygrounds);
document.addEventListener('eco:after-swap', setUpPlaygrounds);

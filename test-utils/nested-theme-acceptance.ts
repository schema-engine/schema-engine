/**
 * Shared browser assertions for a form nested in a grid of another layout theme.
 *
 * @remarks
 * Appearance token rules are scoped by `data-se-theme`, and every grid and grid item carries it,
 * so a page that embeds a form from another engine puts two themes on one element's ancestors.
 * The nearest theme must win whichever stylesheet comes later. Both renderers render the guest
 * form; the host page around it is written here so the two tests cannot drift apart.
 */
import { builtInAxes, createLayoutTheme, defineAxis, type LayoutInput } from '@schema-engine/layout';
import { expect } from 'vitest';
import { loadSsrFrame } from './ssr-grid-acceptance';
import type { LayoutThemeLike } from './ssr-grid-acceptance';

/** Where the `tone` values of each theme point, so a wrong theme or a wrong value shows as another color. */
const ACCENTS = {
	host: { brand: 'red', muted: 'orange' },
	guest: { brand: 'blue', muted: 'purple' },
} as const;

/** The class the author's own stylesheet uses to set the accent token. */
const NESTED_AUTHOR_CLASS = 'author-accent';
const AUTHOR_ACCENT = 'green';

function toneAxis(accents: { brand: string; muted: string }) {
	return defineAxis({
		$type: 'tone',
		metadata: { name: 'Tone' },
		default: 'neutral',
		values: { neutral: {}, brand: { '--se-accent': accents.brand }, muted: { '--se-accent': accents.muted } },
	});
}

/** The page's own theme, whose `tone: brand` accent is red and `tone: muted` accent is orange. */
export const nestedHostTheme = createLayoutTheme({ appearance: [...builtInAxes, toneAxis(ACCENTS.host)] });

/**
 * Layout input of the embedded form's theme, whose `tone: brand` accent is blue and `tone: muted` accent is purple.
 *
 * @remarks
 * Its `md` breakpoint is wider than the host's, so between the two widths the host's `md` slot
 * applies and the guest's does not.
 */
export const nestedGuestLayout = {
	grid: { breakpoints: { md: '60rem' } },
	appearance: [...builtInAxes, toneAxis(ACCENTS.guest)],
} satisfies LayoutInput;

/** A viewport width past the host's `md` (48rem) and short of the guest's (60rem). */
const BETWEEN_BREAKPOINTS_PX = 800;

/** Which variant of the embedded form {@link nestedThemeForm} authors. */
export interface NestedThemeFormOptions {
	/**
	 * Puts {@link NESTED_AUTHOR_CLASS} on the `step` (which carries a pick but no theme) or on the `form`
	 * (the element that carries the theme and a pick together).
	 */
	authorClass?: 'step' | 'form';
	/** Leaves the form and its step with no pick of their own, so only an outer pick can reach them. */
	unpicked?: boolean;
}

/**
 * Config of the embedded form, authored once for both renderers.
 *
 * @param type The `$type` of the renderer's fixture input.
 * @remarks
 * The form picks `tone: brand` and its step picks `tone: muted`, so the form element carries the
 * theme and a pick on one element, and the step carries a different pick of its own but no theme.
 * The field host below it carries the theme and inherits the step's pick.
 */
export function nestedThemeForm(type: string, options: NestedThemeFormOptions = {}) {
	const picks = !options.unpicked;
	return {
		id: 'nested-theme-acceptance',
		title: 'Nested theme acceptance',
		...(picks ? { appearance: { tone: 'brand' } } : {}),
		className: options.authorClass === 'form' ? NESTED_AUTHOR_CLASS : undefined,
		steps: [
			{
				id: 'main',
				title: 'Main',
				...(picks ? { appearance: { tone: 'muted' } } : {}),
				className: options.authorClass === 'step' ? NESTED_AUTHOR_CLASS : undefined,
				elements: [{ $type: type, id: 'nested', name: 'nested', label: 'Nested field' }],
			},
		],
	};
}

type StylesheetOrder = 'host-first' | 'host-last';

/**
 * A page whose grid and items belong to the host theme and whose last item holds the guest form.
 *
 * @remarks
 * The guest's stylesheet travels inside its markup. The host's goes in the head (`host-first`, so
 * the guest's comes later) or after the grid (`host-last`). The two bare items pick `tone: brand`
 * on the host's own theme, to show the host keeps its tokens. `guestItemPick` is an attribute string
 * written on the item that holds the guest form.
 */
function nestedThemeDocument(
	guestHtml: string,
	host: LayoutThemeLike,
	order: StylesheetOrder,
	authorCss: string,
	guestItemPick = '',
): string {
	const hostStyle = `<style>${host.css}</style>`;
	const author = authorCss ? `<style>${authorCss}</style>` : '';
	return [
		'<!DOCTYPE html><html><head><meta charset="utf-8">',
		author,
		order === 'host-first' ? hostStyle : '',
		'</head><body>',
		`<div class="se-grid" data-se-theme="${host.id}">`,
		`<div class="se-grid-item" data-se-theme="${host.id}" data-se-tone="brand" id="host-self"></div>`,
		`<div class="se-grid-item" data-se-theme="${host.id}"><div id="host-descendant" data-se-tone="brand"></div></div>`,
		`<div class="se-grid-item" data-se-theme="${host.id}"${guestItemPick}>${guestHtml}</div>`,
		'</div>',
		order === 'host-last' ? hostStyle : '',
		'</body></html>',
	].join('');
}

/**
 * A page where the host theme is re-entered: a host grid item holds an item of the guest theme,
 * which holds a form on the host theme again.
 *
 * @remarks
 * The form's own stylesheet comes inside its markup; the guest's travels with the guest item, and
 * the host's goes before or after the grid as in {@link nestedThemeDocument}.
 */
function reenteredThemeDocument(
	hostFormHtml: string,
	host: LayoutThemeLike,
	guest: LayoutThemeLike,
	order: StylesheetOrder,
): string {
	const hostStyle = `<style>${host.css}</style>`;
	return [
		'<!DOCTYPE html><html><head><meta charset="utf-8">',
		order === 'host-first' ? hostStyle : '',
		'</head><body>',
		`<div class="se-grid" data-se-theme="${host.id}">`,
		`<div class="se-grid-item" data-se-theme="${host.id}">`,
		`<style>${guest.css}</style>`,
		`<div class="se-grid-item" data-se-theme="${guest.id}">${hostFormHtml}</div>`,
		'</div></div>',
		order === 'host-last' ? hostStyle : '',
		'</body></html>',
	].join('');
}

function accentOf(element: Element): string {
	return getComputedStyle(element).getPropertyValue('--se-accent').trim();
}

function required(doc: Document, selector: string): Element {
	const element = doc.querySelector(selector);
	if (!element) throw new Error(`Expected the nested theme document to contain ${selector}`);
	return element;
}

async function inEachOrder(
	build: (order: StylesheetOrder) => string,
	run: (order: StylesheetOrder, doc: Document) => void,
): Promise<void> {
	for (const order of ['host-first', 'host-last'] as const) {
		const { frame, doc } = await loadSsrFrame(build(order), 800);
		try {
			run(order, doc);
		} finally {
			frame.remove();
		}
	}
}

function describeOrder(what: string, order: StylesheetOrder): string {
	return `${what} with the host stylesheet ${order === 'host-first' ? 'first' : 'last'}`;
}

/**
 * Asserts that a form on one theme nested in a grid item of another picks its own theme's token.
 *
 * @param guestHtml The renderer's server output for {@link nestedThemeForm} on the guest theme.
 * @param host The theme of the page around the form.
 * @param guest The theme of the embedded form's engine.
 * @remarks
 * Runs with the host's stylesheet before and after the guest's, so the result cannot depend on
 * which comes later. The form element carries the theme and the pick `brand`; the step carries the
 * pick `muted` and no theme, so it proves the guest's rule for a descendant matches; the field
 * host inherits the step's token. The host's own items keep the host's token.
 */
export async function expectNestedFormUsesOwnThemeTokens(
	guestHtml: string,
	host: LayoutThemeLike,
	guest: LayoutThemeLike,
): Promise<void> {
	expect(host.id).not.toBe(guest.id);
	expect(guestHtml).toContain(`data-se-theme="${guest.id}"`);
	await inEachOrder(
		(order) => nestedThemeDocument(guestHtml, host, order, ''),
		(order, doc) => {
			const form = required(doc, `[data-se-theme="${guest.id}"][data-se-tone="brand"]`);
			expect(accentOf(form), describeOrder('form element', order)).toBe(ACCENTS.guest.brand);
			const step = required(doc, '[data-se-step][data-se-tone="muted"]');
			expect(accentOf(step), describeOrder('step', order)).toBe(ACCENTS.guest.muted);
			expect(accentOf(required(doc, '.se-form-field')), describeOrder('field', order)).toBe(ACCENTS.guest.muted);

			expect(accentOf(required(doc, '#host-self')), describeOrder('host item', order)).toBe(ACCENTS.host.brand);
			expect(accentOf(required(doc, '#host-descendant')), describeOrder('host descendant', order)).toBe(
				ACCENTS.host.brand,
			);
		},
	);
}

/** The stylesheet text without its `@scope` rules, which sit one per line, as a browser without `@scope` sees it. */
function withoutScopeRules(text: string): string {
	return text.replaceAll(/^@scope [^\n]*?\}\}/gm, '');
}

/**
 * Asserts the same nesting as {@link expectNestedFormUsesOwnThemeTokens} with the `@scope` rules
 * removed from both stylesheets, so only the plain fallback rules apply.
 *
 * @remarks
 * Every browser the tests run in supports `@scope`, so without this the plain rules, which a
 * browser without it relies on, would never be exercised.
 */
export async function expectNestedFormUsesOwnThemeTokensWithoutScope(
	guestHtml: string,
	host: LayoutThemeLike,
	guest: LayoutThemeLike,
): Promise<void> {
	const stripped = withoutScopeRules(guestHtml);
	expect(stripped).not.toBe(guestHtml);
	expect(withoutScopeRules(host.css)).not.toBe(host.css);
	await expectNestedFormUsesOwnThemeTokens(stripped, { id: host.id, css: withoutScopeRules(host.css) }, guest);
}

/**
 * Asserts that a theme re-entered below another theme still uses its own tokens (A in B in A).
 *
 * @param hostFormHtml The renderer's server output for {@link nestedThemeForm} on the host theme.
 * @param host The theme of the outer grid and of the form.
 * @param guest The theme of the item between them.
 * @remarks
 * The step carries no theme and picks `muted`, and a guest theme's element sits between it and the
 * nearest host root that is not the form's own. Only a rule that stops at the nearest theme root
 * reaches it; without one the step shows the form's `brand` token through inheritance.
 */
export async function expectReenteredThemeUsesOwnTokens(
	hostFormHtml: string,
	host: LayoutThemeLike,
	guest: LayoutThemeLike,
): Promise<void> {
	expect(host.id).not.toBe(guest.id);
	expect(hostFormHtml).toContain(`data-se-theme="${host.id}"`);
	await inEachOrder(
		(order) => reenteredThemeDocument(hostFormHtml, host, guest, order),
		(order, doc) => {
			const form = required(doc, `form[data-se-tone="brand"], rui-form[data-se-tone="brand"]`);
			expect(accentOf(form), describeOrder('form element', order)).toBe(ACCENTS.host.brand);
			const step = required(doc, '[data-se-step][data-se-tone="muted"]');
			expect(accentOf(step), describeOrder('step', order)).toBe(ACCENTS.host.muted);
			expect(accentOf(required(doc, '.se-form-field')), describeOrder('field', order)).toBe(ACCENTS.host.muted);
		},
	);
}

/**
 * Asserts that an author's class outranks the axis token rules of both themes.
 *
 * @param guestHtml The renderer's server output for {@link nestedThemeForm} with the author class.
 * @remarks
 * The author's stylesheet comes first in the page, so only specificity can make it win: the token
 * rules sit in `:where()` and carry none.
 */
export async function expectAuthorClassOutranksNestedTokens(
	guestHtml: string,
	host: LayoutThemeLike,
	guest: LayoutThemeLike,
): Promise<void> {
	expect(guestHtml).toContain(`data-se-theme="${guest.id}"`);
	await inEachOrder(
		(order) =>
			nestedThemeDocument(guestHtml, host, order, `.${NESTED_AUTHOR_CLASS}{--se-accent:${AUTHOR_ACCENT};}`),
		(_order, doc) => {
			const step = required(doc, `.${NESTED_AUTHOR_CLASS}`);
			expect(step.getAttribute('data-se-tone')).toBe('muted');
			expect(accentOf(step)).toBe(AUTHOR_ACCENT);
			expect(accentOf(required(doc, '.se-form-field'))).toBe(AUTHOR_ACCENT);
		},
	);
}

/**
 * A page whose grid item places itself with an `md` slot and holds the guest form.
 *
 * @remarks
 * Stands for a host that places the item the form sits in, so the item's own slot is what the
 * guest's items must not read.
 */
function placedHostItemDocument(guestHtml: string, host: LayoutThemeLike): string {
	return [
		'<!DOCTYPE html><html><head><meta charset="utf-8">',
		`<style>${host.css}</style>`,
		'</head><body>',
		`<div class="se-grid" data-se-theme="${host.id}">`,
		`<div class="se-grid-item" data-se-theme="${host.id}" id="host-placed" style="--se-item-grid-column-md:span 6">${guestHtml}</div>`,
		'</div>',
		'</body></html>',
	].join('');
}

/**
 * Asserts that a form of a theme with other breakpoints, nested in a grid item of another theme,
 * does not read the placement that item's theme applied at a width the form's theme has not reached.
 *
 * @param guestHtml The renderer's server output for {@link nestedThemeForm} on {@link nestedGuestLayout}.
 * @remarks
 * At 800px the host's `md` slot applies and the guest's does not. Custom properties inherit, so a
 * guest field would take the host item's `span 6` if the stylesheet's private cascade variables
 * were named alike in both themes. The theme id in those names is what this guards.
 */
export async function expectNestedGuestIgnoresHostSlots(
	guestHtml: string,
	host: LayoutThemeLike,
	guest: LayoutThemeLike,
): Promise<void> {
	expect(host.id).not.toBe(guest.id);
	expect(guestHtml).toContain(`data-se-theme="${guest.id}"`);
	const { frame, doc } = await loadSsrFrame(placedHostItemDocument(guestHtml, host), BETWEEN_BREAKPOINTS_PX);
	try {
		expect(getComputedStyle(required(doc, '#host-placed')).gridColumn, 'host item at its md').toBe('span 6');
		expect(getComputedStyle(required(doc, '.se-form-field')).gridColumn, 'guest field below its md').toBe('auto');

		frame.style.width = '400px';
		await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
		expect(getComputedStyle(required(doc, '#host-placed')).gridColumn, 'host item below its md').toBe('auto');
		expect(getComputedStyle(required(doc, '.se-form-field')).gridColumn, 'guest field narrow').toBe('auto');
	} finally {
		frame.remove();
	}
}

async function inFrame(html: string, run: (doc: Document) => void): Promise<void> {
	const { frame, doc } = await loadSsrFrame(html, 800);
	try {
		run(doc);
	} finally {
		frame.remove();
	}
}

/**
 * Asserts that a form nested in a grid item of its own theme (A in A) still takes that theme's tokens.
 *
 * @param guestHtml The renderer's server output for {@link nestedThemeForm} on the guest theme.
 * @param guest The theme of the page's grid and of the form.
 * @remarks
 * The enclosing item picks `muted` itself, so a wrong result shows as the outer pick reaching the form
 * instead of the form's own `brand`. The step and the field below it must still read `muted`: a rule
 * that treated the outer grid of the same theme as "another theme" would drop them. It runs with and
 * without the `@scope` rules, since the plain rules are what a browser without `@scope` relies on.
 */
export async function expectFormNestedInItsOwnThemeUsesItsTokens(
	guestHtml: string,
	guest: LayoutThemeLike,
): Promise<void> {
	expect(guestHtml).toContain(`data-se-theme="${guest.id}"`);
	for (const scoped of [true, false]) {
		const variant = scoped ? 'with @scope' : 'without @scope';
		const html = [
			'<!DOCTYPE html><html><head><meta charset="utf-8">',
			`<style>${scoped ? guest.css : withoutScopeRules(guest.css)}</style>`,
			'</head><body>',
			`<div class="se-grid" data-se-theme="${guest.id}">`,
			`<div class="se-grid-item" data-se-theme="${guest.id}" data-se-tone="muted" id="outer">`,
			scoped ? guestHtml : withoutScopeRules(guestHtml),
			'</div></div></body></html>',
		].join('');
		await inFrame(html, (doc) => {
			expect(accentOf(required(doc, '#outer')), `enclosing item ${variant}`).toBe(ACCENTS.guest.muted);
			const form = required(doc, `form[data-se-tone="brand"], rui-form[data-se-tone="brand"]`);
			expect(accentOf(form), `form element ${variant}`).toBe(ACCENTS.guest.brand);
			const step = required(doc, '[data-se-step][data-se-tone="muted"]');
			expect(accentOf(step), `step ${variant}`).toBe(ACCENTS.guest.muted);
			expect(accentOf(required(doc, '.se-form-field')), `field ${variant}`).toBe(ACCENTS.guest.muted);
		});
	}
}

/**
 * Asserts that a pick reaches its theme's tokens through plain wrapper elements, inside another theme's item.
 *
 * @param host The theme of the page's grid.
 * @param guest The theme of the element that carries the pick's root.
 * @remarks
 * The page is written here rather than rendered, since the case is about the selector, not about
 * a renderer's markup: a theme root, two wrappers that carry no theme or pick, and an element that
 * picks `muted`. A rule written for a direct child would miss it, and so would one that read the
 * wrappers as another theme. It runs with and without the `@scope` rules.
 */
export async function expectPlainWrapperKeepsThemeTokens(host: LayoutThemeLike, guest: LayoutThemeLike): Promise<void> {
	expect(host.id).not.toBe(guest.id);
	for (const scoped of [true, false]) {
		const css = (theme: LayoutThemeLike) => (scoped ? theme.css : withoutScopeRules(theme.css));
		const variant = scoped ? 'with @scope' : 'without @scope';
		await inEachOrder(
			(order) =>
				nestedThemeDocument(
					[
						`<style>${css(guest)}</style>`,
						`<div data-se-theme="${guest.id}" id="guest-root">`,
						'<div id="wrapper-one"><section id="wrapper-two">',
						'<div id="picked" data-se-tone="muted"><span id="leaf"></span></div>',
						'</section></div></div>',
					].join(''),
					{ id: host.id, css: css(host) },
					order,
					'',
				),
			(order, doc) => {
				const where = `${variant}, host stylesheet ${order === 'host-first' ? 'first' : 'last'}`;
				expect(accentOf(required(doc, '#picked')), `picked element ${where}`).toBe(ACCENTS.guest.muted);
				expect(accentOf(required(doc, '#leaf')), `its child ${where}`).toBe(ACCENTS.guest.muted);
			},
		);
	}
}

/**
 * Asserts that an outer host pick reaches a guest form that makes no pick of its own.
 *
 * @param unpickedHtml The renderer's server output for {@link nestedThemeForm} with `unpicked` on the guest theme.
 * @remarks
 * Tokens are custom properties, so an outer pick on an axis inherits across a theme boundary until a
 * nested form picks a value that declares those tokens. Here the host item holding the form picks
 * `tone: brand`, so the form, its step and its field read the host's red accent; the guest theme's own
 * `brand` (blue) would mean a guest rule matched an element that picked nothing.
 */
export async function expectOuterPickReachesUnpickedGuest(
	unpickedHtml: string,
	host: LayoutThemeLike,
	guest: LayoutThemeLike,
): Promise<void> {
	expect(host.id).not.toBe(guest.id);
	expect(unpickedHtml).toContain(`data-se-theme="${guest.id}"`);
	expect(unpickedHtml.replaceAll(/<style[\s\S]*?<\/style>/g, '')).not.toContain('data-se-tone');
	await inEachOrder(
		(order) => nestedThemeDocument(unpickedHtml, host, order, '', ' data-se-tone="brand" id="host-picked"'),
		(order, doc) => {
			expect(accentOf(required(doc, '#host-picked')), describeOrder('host item', order)).toBe(ACCENTS.host.brand);
			const form = required(doc, `form[data-se-theme="${guest.id}"], rui-form[data-se-theme="${guest.id}"]`);
			expect(accentOf(form), describeOrder('guest form', order)).toBe(ACCENTS.host.brand);
			expect(accentOf(required(doc, '[data-se-step]')), describeOrder('guest step', order)).toBe(
				ACCENTS.host.brand,
			);
			expect(accentOf(required(doc, '.se-form-field')), describeOrder('guest field', order)).toBe(
				ACCENTS.host.brand,
			);
		},
	);
}

/**
 * Asserts that an author class on the element that carries the theme and a pick together outranks the
 * token rules, and that the pick of a step below it still applies.
 *
 * @param formClassHtml The renderer's server output for {@link nestedThemeForm} with the author class on the `form`.
 * @remarks
 * The form element is where a token rule can match twice, as the theme root itself and as a descendant
 * selector of another theme's grid, so this is the place a specificity slip would show. The class sets
 * one custom property on one element, so the step below, which picks `muted`, keeps its own accent.
 */
export async function expectAuthorClassOutranksTokensOnThemeRoot(
	formClassHtml: string,
	host: LayoutThemeLike,
	guest: LayoutThemeLike,
): Promise<void> {
	expect(formClassHtml).toContain(`data-se-theme="${guest.id}"`);
	await inEachOrder(
		(order) =>
			nestedThemeDocument(formClassHtml, host, order, `.${NESTED_AUTHOR_CLASS}{--se-accent:${AUTHOR_ACCENT};}`),
		(order, doc) => {
			const form = required(doc, `.${NESTED_AUTHOR_CLASS}`);
			expect(form.getAttribute('data-se-theme'), describeOrder('form element', order)).toBe(guest.id);
			expect(form.getAttribute('data-se-tone'), describeOrder('form element pick', order)).toBe('brand');
			expect(accentOf(form), describeOrder('form element', order)).toBe(AUTHOR_ACCENT);
			const step = required(doc, '[data-se-step][data-se-tone="muted"]');
			expect(accentOf(step), describeOrder('step', order)).toBe(ACCENTS.guest.muted);
		},
	);
}

/**
 * Pins what A in B in A reads without `@scope`: the documented limit of the plain rules.
 *
 * @param hostFormHtml The renderer's server output for {@link nestedThemeForm} on the host theme.
 * @remarks
 * The plain rules cannot say "no other theme between" for a theme re-entered below another, so the
 * step, which sits below the guest theme's item, matches no host rule and inherits the form's `brand`
 * accent instead of its own `muted` one. With `@scope` ({@link expectReenteredThemeUsesOwnTokens}) it
 * is `muted`. A change that makes the plain rules exact, or breaks them further, must change this
 * test and the layout README ("Nested themes") together.
 */
export async function expectReenteredThemeFallsBackWithoutScope(
	hostFormHtml: string,
	host: LayoutThemeLike,
	guest: LayoutThemeLike,
): Promise<void> {
	expect(host.id).not.toBe(guest.id);
	expect(hostFormHtml).toContain(`data-se-theme="${host.id}"`);
	const plainHtml = withoutScopeRules(hostFormHtml);
	expect(plainHtml).not.toBe(hostFormHtml);
	const plainHost = { id: host.id, css: withoutScopeRules(host.css) };
	const plainGuest = { id: guest.id, css: withoutScopeRules(guest.css) };
	await inEachOrder(
		(order) => reenteredThemeDocument(plainHtml, plainHost, plainGuest, order),
		(order, doc) => {
			const form = required(doc, `form[data-se-tone="brand"], rui-form[data-se-tone="brand"]`);
			expect(accentOf(form), describeOrder('form element', order)).toBe(ACCENTS.host.brand);
			const step = required(doc, '[data-se-step][data-se-tone="muted"]');
			expect(accentOf(step), describeOrder('step', order)).toBe(ACCENTS.host.brand);
			expect(accentOf(required(doc, '.se-form-field')), describeOrder('field', order)).toBe(ACCENTS.host.brand);
		},
	);
}

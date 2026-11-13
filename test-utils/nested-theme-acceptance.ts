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

/**
 * Config of the embedded form, authored once for both renderers.
 *
 * @param type The `$type` of the renderer's fixture input.
 * @param authorClass Puts {@link NESTED_AUTHOR_CLASS} on the step, for the author-class scenario.
 * @remarks
 * The form picks `tone: brand` and its step picks `tone: muted`, so the form element carries the
 * theme and a pick on one element, and the step carries a different pick of its own but no theme.
 * The field host below it carries the theme and inherits the step's pick.
 */
export function nestedThemeForm(type: string, authorClass = false) {
	return {
		id: 'nested-theme-acceptance',
		title: 'Nested theme acceptance',
		appearance: { tone: 'brand' },
		steps: [
			{
				id: 'main',
				title: 'Main',
				appearance: { tone: 'muted' },
				className: authorClass ? NESTED_AUTHOR_CLASS : undefined,
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
 * on the host's own theme, to show the host keeps its tokens.
 */
function nestedThemeDocument(
	guestHtml: string,
	host: LayoutThemeLike,
	order: StylesheetOrder,
	authorCss: string,
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
		`<div class="se-grid-item" data-se-theme="${host.id}">${guestHtml}</div>`,
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

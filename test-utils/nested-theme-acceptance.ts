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

/** Where the `tone: brand` token of each theme points. */
export const NESTED_ACCENTS = { host: 'red', guest: 'blue' } as const;

/** The class the author's own stylesheet uses to set the accent token. */
export const NESTED_AUTHOR_CLASS = 'author-accent';
const AUTHOR_ACCENT = 'green';

function toneAxis(accent: string) {
	return defineAxis({
		$type: 'tone',
		metadata: { name: 'Tone' },
		default: 'neutral',
		values: { neutral: {}, brand: { '--se-accent': accent } },
	});
}

/** The page's own theme, whose `tone: brand` accent is red. */
export const nestedHostTheme = createLayoutTheme({ appearance: [...builtInAxes, toneAxis(NESTED_ACCENTS.host)] });

/** Layout input of the embedded form's theme, whose `tone: brand` accent is blue. */
export const nestedGuestLayout = { appearance: [...builtInAxes, toneAxis(NESTED_ACCENTS.guest)] } satisfies LayoutInput;

/**
 * Config of the embedded form, authored once for both renderers.
 *
 * @param type The `$type` of the renderer's fixture input.
 * @param authorClass Puts {@link NESTED_AUTHOR_CLASS} on the step, for the author-class scenario.
 * @remarks
 * The pick sits on the form, so the form element carries the theme and the pick on one element, and
 * the step and the field below it inherit the pick without carrying a theme of their own.
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

function accentOf(element: Element): string {
	return getComputedStyle(element).getPropertyValue('--se-accent').trim();
}

function required(doc: Document, selector: string): Element {
	const element = doc.querySelector(selector);
	if (!element) throw new Error(`Expected the nested theme document to contain ${selector}`);
	return element;
}

async function inEachOrder(
	run: (order: StylesheetOrder, doc: Document) => void,
	build: (order: StylesheetOrder) => string,
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

/**
 * Asserts that a form on one theme nested in a grid item of another picks its own theme's token.
 *
 * @param guestHtml The renderer's server output for {@link nestedThemeForm}.
 * @param host The theme of the page around the form.
 * @param guest The theme of the embedded form's engine.
 * @remarks
 * Runs with the host's stylesheet before and after the guest's, because a descendant rule from
 * each theme matches the same element and only the later one used to win. The form element
 * carries the theme and the pick together; the step and the field only inherit it.
 */
export async function expectNestedFormUsesOwnThemeTokens(
	guestHtml: string,
	host: LayoutThemeLike,
	guest: LayoutThemeLike,
): Promise<void> {
	expect(host.id).not.toBe(guest.id);
	expect(guestHtml).toContain(`data-se-theme="${guest.id}"`);
	await inEachOrder(
		(order, doc) => {
			const message = (what: string) =>
				`${what} with the host stylesheet ${order === 'host-first' ? 'first' : 'last'}`;
			const form = required(doc, `[data-se-theme="${guest.id}"][data-se-tone="brand"]`);
			expect(accentOf(form), message('form element')).toBe(NESTED_ACCENTS.guest);
			const step = required(doc, '[data-se-step][data-se-tone="brand"]');
			expect(accentOf(step), message('step')).toBe(NESTED_ACCENTS.guest);
			expect(accentOf(required(doc, '.se-form-field')), message('field')).toBe(NESTED_ACCENTS.guest);

			expect(accentOf(required(doc, '#host-self')), message('host item')).toBe(NESTED_ACCENTS.host);
			expect(accentOf(required(doc, '#host-descendant')), message('host descendant')).toBe(NESTED_ACCENTS.host);
		},
		(order) => nestedThemeDocument(guestHtml, host, order, ''),
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
	await inEachOrder(
		(_order, doc) => {
			const step = required(doc, `.${NESTED_AUTHOR_CLASS}`);
			expect(step.getAttribute('data-se-tone')).toBe('brand');
			expect(accentOf(step)).toBe(AUTHOR_ACCENT);
			expect(accentOf(required(doc, '.se-form-field'))).toBe(AUTHOR_ACCENT);
		},
		(order) =>
			nestedThemeDocument(guestHtml, host, order, `.${NESTED_AUTHOR_CLASS}{--se-accent:${AUTHOR_ACCENT};}`),
	);
	expect(guestHtml).toContain(`data-se-theme="${guest.id}"`);
}

/**
 * A small evaluator for the grid half of a generated stylesheet, so tests assert what an element
 * computes at a viewport width instead of how the stylesheet is spelled.
 *
 * @remarks
 * It models only what the generator emits: plain rules and `min-width` media queries keyed on
 * `.se-grid` / `.se-grid-item` plus the theme attribute, `var()` with fallbacks, `initial`, and
 * custom property inheritance from a parent. Same-specificity rules apply in source order, and
 * an inline value beats the stylesheet. The `rem` threshold is read at a 16px root.
 */

export type Kind = 'grid' | 'item';

type Computed = Record<string, string | undefined>;

interface Rule {
	selector: string;
	minWidthPx: number;
	declarations: Array<[name: string, value: string]>;
}

function matchBrace(text: string, open: number): number {
	let depth = 0;
	for (let index = open; index < text.length; index += 1) {
		if (text[index] === '{') depth += 1;
		if (text[index] === '}') {
			depth -= 1;
			if (depth === 0) return index;
		}
	}
	throw new Error('Unbalanced braces in stylesheet.');
}

function splitDeclarations(body: string): Array<[string, string]> {
	const result: Array<[string, string]> = [];
	let depth = 0;
	let start = 0;
	for (let index = 0; index <= body.length; index += 1) {
		const char = body[index];
		if (char === '(') depth += 1;
		if (char === ')') depth -= 1;
		if ((char === ';' && depth === 0) || index === body.length) {
			const declaration = body.slice(start, index);
			start = index + 1;
			const colon = declaration.indexOf(':');
			if (colon > 0) result.push([declaration.slice(0, colon).trim(), declaration.slice(colon + 1).trim()]);
		}
	}
	return result;
}

function toPx(length: string): number {
	const match = /^(\d+(?:\.\d+)?)(px|rem|em)$/.exec(length);
	if (!match) throw new Error(`Unsupported breakpoint length '${length}'.`);
	return Number(match[1]) * (match[2] === 'px' ? 1 : 16);
}

/** Plain and `min-width` rules in source order; other at-rules are skipped. */
function parseRules(css: string): Rule[] {
	const rules: Rule[] = [];
	let index = 0;
	while (index < css.length) {
		const open = css.indexOf('{', index);
		if (open === -1) break;
		const close = matchBrace(css, open);
		const prelude = css.slice(index, open).trim();
		const body = css.slice(open + 1, close);
		index = close + 1;
		const media = /^@media \(min-width:([^)]+)\)$/.exec(prelude);
		if (media) {
			const minWidthPx = toPx(media[1] as string);
			let inner = 0;
			while (inner < body.length) {
				const innerOpen = body.indexOf('{', inner);
				const innerClose = matchBrace(body, innerOpen);
				rules.push({
					selector: body.slice(inner, innerOpen).trim(),
					minWidthPx,
					declarations: splitDeclarations(body.slice(innerOpen + 1, innerClose)),
				});
				inner = innerClose + 1;
			}
		} else if (!prelude.startsWith('@') && !prelude.startsWith(':where')) {
			rules.push({ selector: prelude, minWidthPx: 0, declarations: splitDeclarations(body) });
		}
	}
	return rules;
}

function substitute(value: string, custom: Computed): string | undefined {
	let result = '';
	let index = 0;
	while (index < value.length) {
		const start = value.indexOf('var(', index);
		if (start === -1) return result + value.slice(index);
		result += value.slice(index, start);
		let depth = 0;
		let end = start + 3;
		for (; end < value.length; end += 1) {
			if (value[end] === '(') depth += 1;
			if (value[end] === ')') {
				depth -= 1;
				if (depth === 0) break;
			}
		}
		const inner = value.slice(start + 4, end);
		const comma = inner.indexOf(',');
		const name = (comma === -1 ? inner : inner.slice(0, comma)).trim();
		const fallback = comma === -1 ? undefined : inner.slice(comma + 1).trim();
		const own = custom[name];
		const replacement = own !== undefined ? substitute(own, custom) : undefined;
		const resolved = replacement ?? (fallback === undefined ? undefined : substitute(fallback, custom));
		if (resolved === undefined) return undefined;
		result += resolved;
		index = end + 1;
	}
	return result;
}

const SELECTOR = {
	grid: (themeId: string) => `.se-grid[data-se-theme="${themeId}"]`,
	item: (themeId: string) => `.se-grid-item[data-se-theme="${themeId}"]`,
};

export interface ComputedElement {
	/** Custom properties as the element holds them, to hand to a child as `inherited`. */
	readonly custom: Computed;
	/** A longhand the stylesheet declares, with every `var()` substituted; `undefined` when invalid at computed-value time. */
	value(property: string): string | undefined;
}

export interface ElementOptions {
	/** Inline custom properties, as a renderer writes them. */
	inline?: Record<string, string | undefined>;
	/** The parent's computed custom properties, which inherit unless this element declares them. */
	inherited?: Computed;
}

/**
 * What an element of the given kind computes under a theme at a viewport width.
 *
 * @param css The theme's stylesheet.
 * @param themeId The id the element carries as `data-se-theme`.
 */
export function computeElement(
	css: string,
	themeId: string,
	kind: Kind,
	width: number,
	options: ElementOptions = {},
): ComputedElement {
	const custom: Computed = { ...options.inherited };
	const longhands: Record<string, string> = {};
	const selectors = [`[data-se-theme="${themeId}"]`, SELECTOR[kind](themeId)];
	for (const rule of parseRules(css)) {
		if (!selectors.includes(rule.selector) || rule.minWidthPx > width) continue;
		for (const [name, value] of rule.declarations) {
			if (name.startsWith('--')) custom[name] = value === 'initial' ? undefined : value;
			else longhands[name] = value;
		}
	}
	for (const [name, value] of Object.entries(options.inline ?? {})) custom[name] = value;
	const computed: Computed = {};
	for (const [name, value] of Object.entries(custom)) {
		computed[name] = value === undefined ? undefined : substitute(value, custom);
	}
	return {
		custom: computed,
		value: (property) => {
			const declared = longhands[property];
			return declared === undefined ? undefined : substitute(declared, computed);
		},
	};
}

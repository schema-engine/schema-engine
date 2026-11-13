import { describe, expect, test } from 'vitest';
import {
	builtInAxes,
	checkAppearance,
	compileAppearance,
	defineAxis,
	getAppearanceAttributes,
	getAppearanceCss,
	mergeAppearance,
	pickSupportedAppearance,
} from '@/lib/appearance';

const isScopeRule = (line: string) => line.startsWith('@scope ');

/** The plain rule for one axis value, as a line of the stylesheet. */
function plainRuleOf(css: string, attribute: string): string | undefined {
	return css.split('\n').find((line) => !isScopeRule(line) && line.includes(attribute));
}

/** The `@scope` rule for one axis value, as a line of the stylesheet. */
function scopeRuleOf(css: string, attribute: string): string | undefined {
	return css.split('\n').find((line) => isScopeRule(line) && line.includes(attribute));
}

/** The declaration block of the rule for one axis value, such as `{--se-space:1rem;}`. */
function declarationsOf(css: string, attribute: string): string | undefined {
	const rule = plainRuleOf(css, attribute);
	return rule?.slice(rule.indexOf('{'));
}

const metadata = { name: 'Tone' };
const tone = defineAxis({
	$type: 'tone',
	metadata,
	default: 'neutral',
	values: { neutral: {}, brand: { '--se-accent': '#f60' } },
});

describe('defineAxis', () => {
	test('is a registration whose Standard Schema accepts exactly the value names', () => {
		expect(tone.$type).toBe('tone');
		expect(tone.default).toBe('neutral');
		expect(tone.metadata).toEqual(metadata);
		const validate = (value: unknown) => tone.schema['~standard'].validate(value) as { issues?: unknown[] };
		expect(validate('brand').issues).toBeUndefined();
		expect(validate('loud').issues).toHaveLength(1);
		expect(validate(3).issues).toHaveLength(1);
	});

	test.each([
		['a name that is not a data attribute name', { $type: 'Bad Axis', default: 'a', values: { a: {}, b: {} } }],
		['a single value', { $type: 'tone', default: 'a', values: { a: {} } }],
		[
			'more than five values',
			{ $type: 'tone', default: 'a', values: { a: {}, b: {}, c: {}, d: {}, e: {}, f: {} } },
		],
		['a default that is not a value', { $type: 'tone', default: 'z', values: { a: {}, b: {} } }],
		['a value that would break a selector', { $type: 'tone', default: 'b', values: { 'a"]': {}, b: {} } }],
		[
			'a token that is not a custom property',
			{ $type: 'tone', default: 'b', values: { a: { color: 'red' }, b: {} } },
		],
		[
			'a token value that could close the style element',
			{ $type: 'tone', default: 'b', values: { a: { '--x': '</style>' }, b: {} } },
		],
	])('rejects %s', (_name, definition) => {
		expect(() => defineAxis({ ...definition, metadata } as never)).toThrowError(/appearance/i);
	});
});

describe('builtInAxes', () => {
	test('are size and surface with the documented values', () => {
		expect(builtInAxes.map((axis) => [axis.$type, Object.keys(axis.values)])).toEqual([
			['size', ['compact', 'default', 'comfortable']],
			['surface', ['flat', 'outlined', 'elevated']],
		]);
	});

	test('their tokens are semantic: no token names a single component', () => {
		const tokens = new Set(
			builtInAxes.flatMap((axis) => Object.values(axis.values).flatMap((set) => Object.keys(set))),
		);
		expect([...tokens].toSorted()).toEqual([
			'--se-border-width',
			'--se-control-height',
			'--se-font-size',
			'--se-measure',
			'--se-shadow',
			'--se-space',
			'--se-surface-background',
		]);
		expect(
			[...tokens].filter((token) => /card|button|input|field|form|dialog|modal|shell|step|max-width/.test(token)),
		).toEqual([]);
	});

	test('a default value hands its tokens back to the component fallback, so it undoes an inherited pick', () => {
		const css = getAppearanceCss(compileAppearance(), 'lx');
		expect(declarationsOf(css, '[data-se-size="default"]')).toBe(
			'{--se-space:initial;--se-font-size:initial;--se-measure:initial;--se-control-height:initial;}',
		);
	});

	test('name no host theme variable: the only references are renderer hooks in the se namespace', () => {
		const css = getAppearanceCss(compileAppearance(), 'lx');
		const references = Array.from(css.matchAll(/var\(([^,)]*)/g), (match) => match[1]);
		expect(references.length).toBeGreaterThan(0);
		expect(references.filter((name) => !name.startsWith('--se-'))).toEqual([]);
		expect(css).not.toContain('--space-block');
		expect(css).not.toContain('--on-surface');
		expect(css).not.toContain('CanvasText');
	});

	test('compact and comfortable spacing are hooks a renderer maps to its host theme', () => {
		const css = getAppearanceCss(compileAppearance(), 'lx');
		expect(declarationsOf(css, '[data-se-size="compact"]')).toContain(
			'{--se-space:var(--se-space-compact, var(--se-host-space-compact, 1rem));',
		);
		expect(declarationsOf(css, '[data-se-size="comfortable"]')).toContain(
			'{--se-space:var(--se-space-comfortable, var(--se-host-space-comfortable, 2rem));',
		);
	});

	test('compact and comfortable control height are hooks with neutral fallbacks, and default hands it back', () => {
		const css = getAppearanceCss(compileAppearance(), 'lx');
		expect(declarationsOf(css, '[data-se-size="compact"]')).toContain(
			'--se-control-height:var(--se-control-height-compact, var(--se-host-control-height-compact, 1.75rem));',
		);
		expect(declarationsOf(css, '[data-se-size="comfortable"]')).toContain(
			'--se-control-height:var(--se-control-height-comfortable, var(--se-host-control-height-comfortable, 2.25rem));',
		);
		expect(declarationsOf(css, '[data-se-size="default"]')).toContain('--se-control-height:initial;');
	});

	test('size sets the readable measure: 24rem, 32rem, and the component fallback for default', () => {
		const css = getAppearanceCss(compileAppearance(), 'lx');
		expect(declarationsOf(css, '[data-se-size="compact"]')).toBe(
			'{--se-space:var(--se-space-compact, var(--se-host-space-compact, 1rem));--se-font-size:0.875rem;--se-measure:24rem;--se-control-height:var(--se-control-height-compact, var(--se-host-control-height-compact, 1.75rem));}',
		);
		expect(declarationsOf(css, '[data-se-size="default"]')).toBe(
			'{--se-space:initial;--se-font-size:initial;--se-measure:initial;--se-control-height:initial;}',
		);
		expect(css).toContain('--se-measure:32rem;');
	});

	test('flat and outlined leave the component background alone', () => {
		const css = getAppearanceCss(compileAppearance(), 'lx');
		expect(css).not.toContain('--se-surface-background:transparent');
		expect(declarationsOf(css, '[data-se-surface="flat"]')).toContain('--se-surface-background:initial;');
		expect(declarationsOf(css, '[data-se-surface="outlined"]')).toContain('--se-surface-background:initial;');
	});

	test('elevated is the default, so it hands every token back to the component', () => {
		const css = getAppearanceCss(compileAppearance(), 'lx');
		expect(declarationsOf(css, '[data-se-surface="elevated"]')).toBe(
			'{--se-border-width:initial;--se-shadow:initial;--se-surface-background:initial;}',
		);
	});
});

describe('compileAppearance', () => {
	test('defaults to the built-in axes', () => {
		expect(compileAppearance().axes).toEqual({
			size: ['compact', 'default', 'comfortable'],
			surface: ['flat', 'outlined', 'elevated'],
		});
	});

	test('a host adds an axis, and the last axis of a name wins', () => {
		const dense = defineAxis({
			$type: 'size',
			metadata: { name: 'Size' },
			default: 'dense',
			values: { dense: { '--se-space': '0.25rem' }, airy: { '--se-space': '3rem' } },
		});
		const compiled = compileAppearance([...builtInAxes, tone, dense]);
		expect(compiled.axes).toEqual({
			size: ['dense', 'airy'],
			surface: ['flat', 'outlined', 'elevated'],
			tone: ['neutral', 'brand'],
		});
		expect(compiled.registry.keys()).toEqual(['size', 'surface', 'tone']);
	});

	test('a host overrides a built-in value token', () => {
		const size = defineAxis({
			$type: 'size',
			metadata: { name: 'Size' },
			default: 'default',
			values: { compact: { '--se-space': '0.5rem' }, default: {}, comfortable: { '--se-space': '2rem' } },
		});
		const css = getAppearanceCss(compileAppearance([...builtInAxes, size]), 'lx');
		expect(declarationsOf(css, '[data-se-size="compact"]')).toBe('{--se-space:0.5rem;}');
		expect(css).not.toContain('--se-space:1rem');
	});

	test('token values compile into zero-specificity rules scoped by the theme id', () => {
		const css = getAppearanceCss(compileAppearance([tone]), 'lx');
		expect(css).toContain('[data-se-theme="lx"]');
		expect(css).toContain('--se-accent:#f60');
		const rules = css.split('\n');
		expect(rules.length).toBeGreaterThan(0);
		for (const rule of rules) {
			expect(rule).toMatch(
				isScopeRule(rule) ? /^@scope \(.+\) to \(.+\)\{:where\(.+\)\{[^{}]*\}\}$/ : /^:where\(.+\)\{[^{}]*\}$/,
			);
		}
	});

	test('a plain rule leaves out whatever sits at or below an element of another theme', () => {
		const rule = plainRuleOf(getAppearanceCss(compileAppearance([tone]), 'lx'), '[data-se-tone="brand"]');
		expect(rule).toContain('[data-se-theme="lx"][data-se-tone="brand"]');
		expect(rule).toContain(':not([data-se-theme]:not([data-se-theme="lx"])');
		expect(rule).toMatch(/\[data-se-theme="lx"\] \[data-se-theme\]:not\(\[data-se-theme="lx"\]\) \*/);
	});

	test('a scope rule runs from the theme root down to the nearest other theme and sets the same tokens', () => {
		const css = getAppearanceCss(compileAppearance([tone]), 'lx');
		const rule = scopeRuleOf(css, '[data-se-tone="brand"]');
		expect(rule).toMatch(
			/^@scope \(\[data-se-theme="lx"\]\) to \(\[data-se-theme\]:not\(\[data-se-theme="lx"\]\)\)/,
		);
		expect(rule).toContain(':scope[data-se-tone="brand"]');
		expect(rule?.endsWith(`${declarationsOf(css, '[data-se-tone="brand"]')}}`)).toBe(true);
	});

	test('scope rules come after every plain rule', () => {
		const lines = getAppearanceCss(compileAppearance(), 'lx').split('\n');
		const firstScope = lines.findIndex(isScopeRule);
		expect(firstScope).toBeGreaterThan(0);
		expect(lines.slice(firstScope).every(isScopeRule)).toBe(true);
		expect(lines.slice(0, firstScope).some(isScopeRule)).toBe(false);
	});

	test('rejects an axis that has no Standard Schema', () => {
		const plain = { $type: 'tone', metadata, default: 'a', values: { a: {}, b: {} } };
		expect(() => compileAppearance([plain as never])).toThrowError(
			/Axis 'tone' schema must implement Standard Schema/,
		);
	});

	test('re-checks an axis that did not come from defineAxis', () => {
		const forged = { ...tone, values: { only: {} }, default: 'only' };
		expect(() => compileAppearance([forged])).toThrowError(/2 to 5 values/);
	});

	test('rejects an axis the compiler is told is reserved, and only that axis', () => {
		const step = { ...tone, $type: 'step' };
		expect(() => compileAppearance([step], { reservedNames: ['step'] })).toThrowError(/reserved/);
		expect(() => compileAppearance([step])).not.toThrow();
		expect(() => compileAppearance([tone], { reservedNames: ['step'] })).not.toThrow();
	});
});

describe('checkAppearance', () => {
	const { axes } = compileAppearance([...builtInAxes, tone]);

	test('keeps valid picks', () => {
		expect(checkAppearance({ size: 'compact', tone: 'brand' }, { axes, subject: 'The root' })).toEqual({
			issues: [],
			appearance: { size: 'compact', tone: 'brand' },
		});
	});

	test('an absent pick is no pick', () => {
		expect(checkAppearance(undefined, { axes, subject: 'The root' })).toEqual({ issues: [], appearance: {} });
	});

	test('names an unknown value with the allowed ones', () => {
		const { issues, appearance } = checkAppearance({ surface: 'elevatd' }, { axes, subject: 'The root' });
		expect(issues).toEqual([
			{
				path: ['appearance', 'surface'],
				message: "'elevatd' is not a value of 'surface'. Allowed: flat, outlined, elevated.",
			},
		]);
		expect(appearance).toEqual({});
	});

	test('names an unknown axis with the declared ones', () => {
		const { issues } = checkAppearance({ density: 'high' }, { axes, subject: 'The root' });
		expect(issues[0]?.path).toEqual(['appearance', 'density']);
		expect(issues[0]?.message).toMatch(/Unknown axis 'density'. Declared axes: size, surface, tone/);
	});

	test('rejects a non-string value and a non-object pick', () => {
		const nonString = checkAppearance({ size: 3 }, { axes, subject: 'The root' }).issues[0];
		expect(nonString?.path).toEqual(['appearance', 'size']);
		expect(nonString?.message).toMatch(/^Expected one of/);
		const nonObject = checkAppearance('compact', { axes, subject: 'The root' }).issues[0];
		expect(nonObject?.path).toEqual(['appearance']);
		expect(nonObject?.message).toMatch(/Expected an object/);
	});

	test('an owner rejects an axis it does not support, naming the owner', () => {
		const { issues } = checkAppearance(
			{ size: 'compact', tone: 'brand' },
			{ axes, subject: "Element 'note'", supported: ['size'] },
		);
		expect(issues).toEqual([
			{
				path: ['appearance', 'tone'],
				message: "Element 'note' does not support the axis 'tone'. Supported axes: size.",
			},
		]);
	});

	test.each(['constructor', 'toString', '__proto__', 'hasOwnProperty'])(
		'reports the prototype key %s as an unknown axis instead of throwing',
		(key) => {
			const authored = JSON.parse(`{"${key}":"x"}`);
			const { issues, appearance } = checkAppearance(authored, { axes, subject: 'The root' });
			expect(issues).toHaveLength(1);
			expect(issues[0]?.message).toMatch(new RegExp(`Unknown axis '${key}'`));
			expect(appearance).toEqual({});
		},
	);

	test('an owner that supports nothing says so', () => {
		const { issues } = checkAppearance({ size: 'compact' }, { axes, subject: "Element 'note'", supported: [] });
		expect(issues[0]?.message).toMatch(/Supported axes: \(none\)/);
	});
});

describe('mergeAppearance', () => {
	test('the closer pick wins per axis and the rest is inherited', () => {
		expect(mergeAppearance({ size: 'compact', surface: 'flat' }, { size: 'comfortable' })).toEqual({
			size: 'comfortable',
			surface: 'flat',
		});
	});

	test('missing picks merge as empty', () => {
		expect(mergeAppearance(undefined, undefined)).toEqual({});
		expect(mergeAppearance({ size: 'compact' }, undefined)).toEqual({ size: 'compact' });
	});

	test('does not mutate its inputs', () => {
		const inherited = { size: 'compact' };
		mergeAppearance(inherited, { size: 'default' });
		expect(inherited).toEqual({ size: 'compact' });
	});
});

describe('pickSupportedAppearance', () => {
	test('keeps only the supported axes, and nothing for an owner that declares none', () => {
		expect(pickSupportedAppearance({ size: 'compact', surface: 'flat' }, ['surface'])).toEqual({ surface: 'flat' });
		expect(pickSupportedAppearance({ size: 'compact' }, undefined)).toEqual({});
	});
});

describe('getAppearanceAttributes', () => {
	test('names each axis', () => {
		expect(getAppearanceAttributes({ size: 'compact', surface: 'flat' })).toEqual({
			'data-se-size': 'compact',
			'data-se-surface': 'flat',
		});
		expect(getAppearanceAttributes(undefined)).toEqual({});
	});
});

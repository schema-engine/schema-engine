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
		expect(css).toContain(
			'[data-se-size="default"]){--se-space:initial;--se-font-size:initial;--se-control-height:initial;}',
		);
	});

	test('name no host theme variable', () => {
		const css = getAppearanceCss(compileAppearance(), 'lx');
		expect(css).not.toContain('var(');
		expect(css).not.toContain('--space-block');
		expect(css).not.toContain('--on-surface');
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
		expect(css).toContain('[data-se-size="compact"]){--se-space:0.5rem;}');
		expect(css).not.toContain('--se-space:1rem');
	});

	test('token values compile into zero-specificity rules scoped by the theme id', () => {
		const css = getAppearanceCss(compileAppearance([tone]), 'lx');
		expect(css).toContain('[data-se-theme="lx"]');
		expect(css).toContain('--se-accent:#f60');
		expect(css).toContain(':where([data-se-theme="lx"] [data-se-tone="brand"],');
		expect(css.replaceAll(/:where\([^)]*\)/g, '')).not.toContain('[data-se-');
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
			"appearance.surface: 'elevatd' is not a value of 'surface'. Allowed: flat, outlined, elevated.",
		]);
		expect(appearance).toEqual({});
	});

	test('names an unknown axis with the declared ones', () => {
		const { issues } = checkAppearance({ density: 'high' }, { axes, subject: 'The root' });
		expect(issues[0]).toMatch(/appearance\.density: unknown axis 'density'. Declared axes: size, surface, tone/);
	});

	test('rejects a non-string value and a non-object pick', () => {
		expect(checkAppearance({ size: 3 }, { axes, subject: 'The root' }).issues[0]).toMatch(
			/appearance\.size: expected one of/,
		);
		expect(checkAppearance('compact', { axes, subject: 'The root' }).issues[0]).toMatch(/expected an object/);
	});

	test('an owner rejects an axis it does not support, naming the owner', () => {
		const { issues } = checkAppearance(
			{ size: 'compact', tone: 'brand' },
			{ axes, subject: "Element 'note'", supported: ['size'] },
		);
		expect(issues).toEqual([
			"appearance.tone: Element 'note' does not support the axis 'tone'. Supported axes: size.",
		]);
	});

	test('an owner that supports nothing says so', () => {
		const { issues } = checkAppearance({ size: 'compact' }, { axes, subject: "Element 'note'", supported: [] });
		expect(issues[0]).toMatch(/Supported axes: \(none\)/);
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

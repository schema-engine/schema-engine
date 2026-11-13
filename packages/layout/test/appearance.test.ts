import { describe, expect, test } from 'vitest';
import {
	checkAppearance,
	compileAppearance,
	getAppearanceAttributes,
	getAppearanceCss,
	mergeAppearance,
	pickSupportedAppearance,
} from '@/lib/appearance';

describe('compileAppearance', () => {
	test('ships the size and surface axes', () => {
		expect(compileAppearance().axes).toEqual({
			size: ['compact', 'default', 'comfortable'],
			surface: ['flat', 'outlined', 'elevated'],
		});
	});

	test('a host adds an axis and extends a built-in one', () => {
		expect(compileAppearance({ tone: ['neutral', 'brand'], size: ['dense'] }).axes).toEqual({
			size: ['compact', 'default', 'comfortable', 'dense'],
			surface: ['flat', 'outlined', 'elevated'],
			tone: ['neutral', 'brand'],
		});
	});

	test('token values compile into zero-specificity rules scoped by the theme id', () => {
		const css = getAppearanceCss(compileAppearance({ tone: { brand: { '--se-tone-accent': '#f60' } } }), 'lx');
		expect(css).toContain('[data-se-theme="lx"]');
		expect(css).toContain('--se-tone-accent:#f60');
		expect(css).toContain(':where([data-se-theme="lx"] [data-se-tone="brand"],');
		expect(css.replaceAll(/:where\([^)]*\)/g, '')).not.toContain('[data-se-');
	});

	test('the built-in size paddings fall back to the host theme spacing', () => {
		const css = getAppearanceCss(compileAppearance(), 'lx');
		expect(css).toContain('--se-size-padding:var(--space-block, 1rem);');
		expect(css).toContain('--se-size-padding:var(--space-block-lg, 1.5rem);');
		expect(css).toContain('--se-size-padding:var(--space-block-xl, 2rem);');
	});

	test.each([
		['an axis name that is not a data attribute name', { 'Bad Axis': ['a'] }],
		['an empty value list entry', { tone: [''] }],
		['a value that would break a selector', { tone: ['a"]'] }],
		['a token that is not a custom property', { tone: { brand: { color: 'red' } } }],
		['a token value that could close the style element', { tone: { brand: { '--x': '</style>' } } }],
	])('rejects %s', (_name, appearance) => {
		expect(() => compileAppearance(appearance)).toThrowError(/appearance/i);
	});

	test('rejects an axis the compiler is told is reserved, and only that axis', () => {
		expect(() => compileAppearance({ step: ['a'] }, { reservedNames: ['step'] })).toThrowError(/reserved/);
		expect(() => compileAppearance({ step: ['a'] })).not.toThrow();
		expect(() => compileAppearance({ tone: ['a'] }, { reservedNames: ['step'] })).not.toThrow();
	});
});

describe('checkAppearance', () => {
	const { axes } = compileAppearance({ tone: ['neutral', 'brand'] });

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

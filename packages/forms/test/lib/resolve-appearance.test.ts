import { describe, expect, test } from 'vitest';
import { getDefaultLayoutTheme } from '@schema-engine/layout';
import { resolveAppearance, withAppearance } from '@/lib/resolve-appearance';

const scope = (inherited: Record<string, string> = {}) => ({ axes: getDefaultLayoutTheme().axes, inherited });

describe('resolveAppearance', () => {
	test('an owner that accepts every axis renders with its pick laid over the inherited one', () => {
		const resolved = resolveAppearance({ size: 'compact' }, scope({ size: 'default', surface: 'flat' }), {
			subject: 'The step',
			path: ['steps', 0],
		});
		expect(resolved.selection).toEqual({ size: 'compact', surface: 'flat' });
		expect(resolved.childScope.inherited).toEqual({ size: 'compact', surface: 'flat' });
	});

	test('an owner keeps only the axes it supports but still passes every axis to its children', () => {
		const resolved = resolveAppearance(undefined, scope({ size: 'compact', surface: 'flat' }), {
			subject: "Element 'note'",
			path: ['steps', 0, 'elements', 0],
			supported: ['size'],
		});
		expect(resolved.selection).toEqual({ size: 'compact' });
		expect(resolved.childScope.inherited).toEqual({ size: 'compact', surface: 'flat' });
	});

	test('an owner that supports nothing renders with no pick', () => {
		const resolved = resolveAppearance(undefined, scope({ size: 'compact' }), {
			subject: "Element 'note'",
			path: [],
			supported: [],
		});
		expect(resolved.selection).toEqual({});
	});

	test('issues carry the owner path under the appearance key, or only the key for a standalone element', () => {
		const owner = { subject: "Element 'note'", supported: ['size'] };
		const nested = resolveAppearance({ size: 'huge' }, scope(), { ...owner, path: ['steps', 0, 'elements', 0] });
		expect(nested.issues[0]?.path).toEqual(['steps', 0, 'elements', 0, 'appearance', 'size']);
		expect(nested.issues[0]?.message).toMatch(/'huge' is not a value of 'size'/);
		const standalone = resolveAppearance({ size: 'huge' }, scope(), { ...owner, path: [] });
		expect(standalone.issues[0]?.path).toEqual(['appearance', 'size']);
	});
});

describe('withAppearance', () => {
	test('replaces an authored pick with the resolved one', () => {
		expect(withAppearance({ id: 'a', appearance: { size: 'x' } }, { size: 'compact' })).toEqual({
			id: 'a',
			appearance: { size: 'compact' },
		});
	});

	test('drops the key when nothing resolved, and returns an untouched config as it is', () => {
		expect('appearance' in withAppearance({ id: 'a', appearance: { size: 'x' } }, {})).toBe(false);
		const plain = { id: 'a' };
		expect(withAppearance(plain, {})).toBe(plain);
	});
});

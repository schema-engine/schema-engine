import { describe, expect, test } from 'vitest';
import { getDefaultCompiledAppearance } from '@schema-engine/layout';
import { resolveAppearance, withAppearance } from '@/lib/resolve-appearance';

const scope = (inherited: Record<string, string> = {}) => ({ axes: getDefaultCompiledAppearance().axes, inherited });

describe('resolveAppearance', () => {
	test('an owner that accepts every axis renders with its pick laid over the inherited one', () => {
		const resolved = resolveAppearance({ size: 'compact' }, scope({ size: 'default', surface: 'flat' }), {
			subject: 'The step',
			location: 'steps[0]',
		});
		expect(resolved.selection).toEqual({ size: 'compact', surface: 'flat' });
		expect(resolved.childScope.inherited).toEqual({ size: 'compact', surface: 'flat' });
	});

	test('an owner keeps only the axes it supports but still passes every axis to its children', () => {
		const resolved = resolveAppearance(undefined, scope({ size: 'compact', surface: 'flat' }), {
			subject: "Element 'note'",
			location: 'elements[0]',
			supported: ['size'],
		});
		expect(resolved.selection).toEqual({ size: 'compact' });
		expect(resolved.childScope.inherited).toEqual({ size: 'compact', surface: 'flat' });
	});

	test('an owner that supports nothing renders with no pick', () => {
		const resolved = resolveAppearance(undefined, scope({ size: 'compact' }), {
			subject: "Element 'note'",
			location: '',
			supported: [],
		});
		expect(resolved.selection).toEqual({});
	});

	test('issues carry the owner location, or none for a standalone element', () => {
		const owner = { subject: "Element 'note'", supported: ['size'] };
		expect(resolveAppearance({ size: 'huge' }, scope(), { ...owner, location: 'elements[0]' }).issues[0]).toMatch(
			/^elements\[0\]: appearance\.size/,
		);
		expect(resolveAppearance({ size: 'huge' }, scope(), { ...owner, location: '' }).issues[0]).toMatch(
			/^appearance\.size/,
		);
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

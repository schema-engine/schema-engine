import { describe, expect, test } from 'vitest';
import { findAncestorElement } from '@/lib/rui-form-utils';

describe('findAncestorElement', () => {
	test('finds the nearest ancestor with one of the local names', () => {
		const outer = document.createElement('rui-form');
		const inner = document.createElement('se-form-instance');
		const host = document.createElement('div');
		outer.append(inner);
		inner.append(host);

		expect(findAncestorElement(host, 'rui-form')).toBe(outer);
		expect(findAncestorElement(host, 'rui-form', 'se-form-instance')).toBe(inner);
	});

	test('returns null when no ancestor matches', () => {
		const host = document.createElement('div');
		document.createElement('rui-form').append(host);

		expect(findAncestorElement(host, 'se-form-instance')).toBeNull();
	});
});

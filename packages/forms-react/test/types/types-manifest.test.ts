import { describe, expect, test } from 'bun:test';
import { TYPE_MANIFEST } from '@/types-manifest';

describe('types-manifest', () => {
	test('covers all built-in registration keys', () => {
		expect(Object.keys(TYPE_MANIFEST.elements)).toHaveLength(17);
		expect(Object.keys(TYPE_MANIFEST.layouts)).toHaveLength(3);
		expect(Object.keys(TYPE_MANIFEST.steppers)).toHaveLength(3);
	});
});

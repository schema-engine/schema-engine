import { describe, expect, test } from 'vitest';
import { formatIssuePath } from '../src';

describe('formatIssuePath', () => {
	test.each([
		[[], ''],
		[['view', '$type'], 'view.$type'],
		[['steps', 0, 'elements', 2, 'grid', 'width'], 'steps[0].elements[2].grid.width'],
		[['actions', 1, 0, '$type'], 'actions[1][0].$type'],
		[[0, 'id'], '[0].id'],
	])('%j reads as %j', (path, text) => {
		expect(formatIssuePath(path)).toBe(text);
	});

	test('a missing path is the empty string', () => {
		expect(formatIssuePath(undefined)).toBe('');
	});

	test('reads a segment given as { key } like the key itself', () => {
		expect(formatIssuePath([{ key: 'steps' }, { key: 1 }, { key: 0 }, 'subject'])).toBe('steps[1][0].subject');
	});

	test('adds ids only when it is given the source', () => {
		const source = { steps: [{ id: 'main', elements: [{ id: 'email' }] }] };
		const path = ['steps', 0, { key: 'elements' }, { key: 0 }, 'id'];

		expect(formatIssuePath(path)).toBe('steps[0].elements[0].id');
		expect(formatIssuePath(path, source)).toBe('steps[0] (main).elements[0] (email).id');
	});
});

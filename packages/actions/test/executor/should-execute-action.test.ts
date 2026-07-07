import { describe, test, expect } from 'bun:test';
import { shouldExecuteAction } from '../../src/executor';

describe('shouldExecuteAction', () => {
	test('uses custom triggers when provided', () => {
		expect(
			shouldExecuteAction({ id: 'a', $type: 'test', triggers: ['submit', 'change'] }, 'submit', ['mount']),
		).toBe(true);
		expect(
			shouldExecuteAction({ id: 'a', $type: 'test', triggers: ['submit', 'change'] }, 'mount', ['mount']),
		).toBe(false);
	});

	test('falls back to default triggers when custom triggers are absent', () => {
		expect(shouldExecuteAction({ id: 'a', $type: 'test' }, 'mount', ['mount', 'submit'])).toBe(true);
		expect(shouldExecuteAction({ id: 'a', $type: 'test' }, 'change', ['mount', 'submit'])).toBe(false);
	});

	test('treats an empty custom triggers array as never run', () => {
		expect(shouldExecuteAction({ id: 'a', $type: 'test', triggers: [] }, 'submit', ['submit'])).toBe(false);
	});
});

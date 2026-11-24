import { describe, expect, test } from 'vitest';
import { issueText } from '@/state-container/issue-text';
import type { FormIssueFormatter, FormStateIssue } from '@/state-container/types';

const issue = (extra: Partial<FormStateIssue> = {}): FormStateIssue => ({
	type: 'minLength',
	source: 'validation',
	params: { minLength: 3 },
	...extra,
});

describe('issueText', () => {
	test("is the formatter's text, given the issue and its path", () => {
		const formatIssue: FormIssueFormatter = (given, { path }) => `${path}: ${given.type}`;

		expect(issueText(issue({ message: 'ignored' }), 'name', formatIssue)).toBe('name: minLength');
	});

	test("falls back to the issue's own message when the formatter says nothing", () => {
		expect(issueText(issue({ message: 'Too short' }), 'name', () => '')).toBe('Too short');
		expect(issueText(issue({ message: 'Too short' }), 'name', undefined)).toBe('Too short');
	});

	test('is nothing for an issue with neither, and never its type', () => {
		expect(issueText(issue(), 'name', undefined)).toBeUndefined();
	});
});

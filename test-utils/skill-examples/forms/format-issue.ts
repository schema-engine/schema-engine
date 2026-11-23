import { createFormEngine } from '@schema-engine/forms';
import type { FormIssueFormatter } from '@schema-engine/forms/state-container';
import { textRegistration } from './engine';

type Text = (params: Readonly<Record<string, unknown>>) => string;

const byRuleId: Record<string, Text> = {
	'name-required': () => 'Tell us your name',
};

const byType: Record<string, Text> = {
	required: () => 'This field is required',
	minLength: ({ minLength }) => `Use at least ${String(minLength)} characters`,
	taken: () => 'Already taken',
};

export const formatIssue: FormIssueFormatter = (issue) => {
	const ruleId = issue.source === 'submission' ? undefined : issue.ruleId;
	const text = byRuleId[ruleId ?? ''] ?? byType[issue.type];
	return text?.(issue.params ?? {}) ?? '';
};

export const localizedEngine = createFormEngine({ elements: [textRegistration], formatIssue });

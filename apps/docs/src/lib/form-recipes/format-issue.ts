import { createFormEngine } from '@schema-engine/forms';
import type { FormIssueFormatter } from '@schema-engine/forms/state-container';
import { textInput } from './engine';

export const catalogue: Record<string, string> = {
	'form.fields.email': 'Email',
	'form.rules.password-min': 'Use at least {minLength} characters for your password',
	'form.validation.minLength': 'Use at least {minLength} characters',
	'form.validation.required': '{field} is required',
	'form.native.typeMismatch': 'Enter a valid {inputType}',
	'form.native.badInput': 'Enter a number',
	'form.submission.actionFailed': 'Something went wrong. Please try again.',
};

/** The first catalogue entry among `keys`, with `{name}` filled from `values`. */
function t(keys: string[], values: Record<string, unknown> = {}): string | undefined {
	const key = keys.find((candidate) => candidate in catalogue);
	return (
		key &&
		catalogue[key]!.replace(/\{(\w+)\}/g, (_, name: string) => {
			const value = values[name];
			return typeof value === 'string' || typeof value === 'number' ? String(value) : '';
		})
	);
}

export const formatIssue: FormIssueFormatter = (issue, { path }) => {
	if (issue.source === 'server' && issue.message) return issue.message;

	const keys = [
		'ruleId' in issue && issue.ruleId ? `form.rules.${issue.ruleId}` : undefined,
		`form.${issue.source}.${issue.type}`,
	].filter((key): key is string => key !== undefined);

	return t(keys, { ...issue.params, field: t([`form.fields.${path}`]) ?? path }) ?? issue.message ?? '';
};

export const engine = createFormEngine({ elements: [textInput], formatIssue });

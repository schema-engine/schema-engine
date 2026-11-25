import { createFormEngine } from '@schema-engine/forms';
import type { FormIssueFormatter } from '@schema-engine/forms/state-container';
import { textInput } from './engine';
import { t } from './i18n.helper';

export const formatIssue: FormIssueFormatter = (issue, { path }) => {
	if (issue.source === 'server' && issue.message) return issue.message;

	const keys = [
		'ruleId' in issue && issue.ruleId ? `form.rules.${issue.ruleId}` : undefined,
		`form.${issue.source}.${issue.type}`,
	].filter((key): key is string => key !== undefined);

	return t(keys, { ...issue.params, field: t([`form.fields.${path}`]) ?? path }) ?? issue.message ?? '';
};

export const engine = createFormEngine({ elements: [textInput], formatIssue });

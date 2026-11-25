import type { FormIssueFormatter } from '@schema-engine/forms/state-container';
import { createRadiantFormEngine, schemaFormRegistrations } from '@schema-engine/forms-radiant';
import { t } from './i18n.helper';

export const formatIssue: FormIssueFormatter = (issue, { path }) => {
	if (issue.source === 'server' && issue.message) return issue.message;

	const keys = [
		'ruleId' in issue && issue.ruleId ? `form.rules.${issue.ruleId}` : undefined,
		`form.${issue.source}.${issue.type}`,
	].filter((key): key is string => key !== undefined);

	return t(keys, { ...issue.params, field: t([`form.fields.${path}`]) ?? path }) ?? issue.message ?? '';
};

export const engine = createRadiantFormEngine({ elements: schemaFormRegistrations, formatIssue });

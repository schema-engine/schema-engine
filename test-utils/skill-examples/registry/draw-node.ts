import { formatIssuePath, safeParseNode } from '@schema-engine/registry';
import { widgets } from './widgets';

export function nodeIssues(node: unknown, index: number): string[] {
	const parsed = safeParseNode(widgets, node, { path: ['children', index] });
	return parsed.success ? [] : parsed.issues.map((issue) => `${formatIssuePath(issue.path)}: ${issue.message}`);
}

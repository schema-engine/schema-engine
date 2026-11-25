import { safeParseNode } from '@schema-engine/registry';
import { widgets } from './widgets';

export function nodeIssues(node: unknown, index: number): string[] {
	const parsed = safeParseNode(widgets, node, ['children', index]);
	return parsed.success ? [] : parsed.issues.map((issue) => `${issue.path?.join('.')}: ${issue.message}`);
}

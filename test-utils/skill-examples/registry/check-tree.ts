import * as z from 'zod/mini';
import { createRegistry, formatIssuePath, safeParseTree } from '@schema-engine/registry';

const nodes = createRegistry('Node', [
	{
		$type: 'page',
		schema: z.object({ $type: z.literal('page'), sections: z.array(z.unknown()) }),
		metadata: { name: 'Page' },
		childPaths: [{ keys: ['sections'], accepts: ['section'] }],
	},
	{
		$type: 'section',
		schema: z.object({ $type: z.literal('section'), title: z.string() }),
		metadata: { name: 'Section' },
	},
]);

export function documentIssues(document: unknown): string[] {
	const parsed = safeParseTree(nodes, document, { accepts: ['page'] });
	return parsed.success
		? []
		: parsed.issues.map((issue) => `${formatIssuePath(issue.path, document)}: ${issue.message}`);
}

export function sectionTitles(document: unknown): string[] {
	const parsed = safeParseTree(nodes, document, { accepts: ['page'] });
	return parsed.success ? parsed.tree.data.sections.map((section) => section.title) : [];
}

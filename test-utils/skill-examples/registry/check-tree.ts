import * as z from 'zod/mini';
import { createRegistry, formatIssuePath, safeParseTree } from '@schema-engine/registry';

const nodes = createRegistry('Node', [
	{
		$type: 'page',
		schema: z.looseObject({ $type: z.literal('page'), sections: z.array(z.looseObject({ $type: z.string() })) }),
		metadata: { name: 'Page' },
		childPaths: [['sections']],
	},
	{
		$type: 'section',
		schema: z.looseObject({ $type: z.literal('section'), title: z.string() }),
		metadata: { name: 'Section' },
	},
]);

export function documentIssues(document: unknown): string[] {
	const parsed = safeParseTree(nodes, document);
	return parsed.success
		? []
		: parsed.issues.map((issue) => `${formatIssuePath(issue.path, document)}: ${issue.message}`);
}

export function sectionTitles(document: unknown): string[] {
	const parsed = safeParseTree(nodes, document);
	const sections = parsed.success ? [parsed.tree.children.sections ?? []].flat() : [];
	return sections.flatMap((section) => (section.$type === 'section' ? [section.data.title] : []));
}

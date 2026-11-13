import * as z from 'zod/mini';

/** Public URL prefix for docs pages. */
export const DOCS_ROOT = '/docs';

/** Sidebar group order (frontmatter `group` values). */
export const DOCS_GROUP_ORDER = [
	'Getting Started',
	'Forms',
	'Forms React',
	'Forms Radiant',
	'Capabilities',
	'Actions',
	'Registry',
	'Examples',
] as const;

export type DocsGroupName = (typeof DOCS_GROUP_ORDER)[number];

export const DOCS_GROUP_ORDER_INDEX = new Map<string, number>(DOCS_GROUP_ORDER.map((name, index) => [name, index]));

/** Preferred section order for `llms.txt` (first slug segment). */
export const LLM_SECTION_ORDER = [
	'getting-started',
	'forms',
	'forms-react',
	'forms-radiant',
	'capabilities',
	'actions',
	'registry',
	'examples',
] as const;

export const docsFrontmatterSchema = z.object({
	title: z.string(),
	description: z.string(),
	group: z.optional(z.string()),
	order: z.optional(z.coerce.number()),
	/** Set to `false` to leave the page out of `llms.txt` and the `llms-content/` exports. */
	llms: z.optional(z.boolean()),
});

export type DocsFrontmatter = z.infer<typeof docsFrontmatterSchema>;

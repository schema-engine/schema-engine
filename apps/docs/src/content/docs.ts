import type { ContentEntry } from '@ecopages/content-processor/types';
import type { JsxRenderable } from '@ecopages/jsx';
import * as z from 'zod/mini';
import {
	actionsIcon,
	capabilitiesIcon,
	examplesIcon,
	formsIcon,
	formsRadiantIcon,
	formsReactIcon,
	gettingStartedIcon,
	registryIcon,
	stylingIcon,
} from './section-icons';

/** Public URL prefix for docs pages. */
export const DOCS_ROOT = '/docs';

/** Sidebar section order. A section is the first folder under `src/content/docs`. */
export const DOCS_SECTION_ORDER = [
	'getting-started',
	'forms',
	'forms-react',
	'forms-radiant',
	'styling',
	'capabilities',
	'actions',
	'registry',
	'examples',
] as const;

export type DocsSectionId = (typeof DOCS_SECTION_ORDER)[number];

export const DOCS_SECTION_ORDER_INDEX = new Map<string, number>(
	DOCS_SECTION_ORDER.map((section, index) => [section, index]),
);

export const LLM_SECTION_ORDER = [...DOCS_SECTION_ORDER] as const;

export const DOCS_SECTION_CONFIG: Record<DocsSectionId, { title: string; icon: JsxRenderable }> = {
	'getting-started': { title: 'Getting Started', icon: gettingStartedIcon },
	forms: { title: 'Forms', icon: formsIcon },
	'forms-react': { title: 'Forms React', icon: formsReactIcon },
	'forms-radiant': { title: 'Forms Radiant', icon: formsRadiantIcon },
	styling: { title: 'Styling', icon: stylingIcon },
	capabilities: { title: 'Capabilities', icon: capabilitiesIcon },
	actions: { title: 'Actions', icon: actionsIcon },
	registry: { title: 'Registry', icon: registryIcon },
	examples: { title: 'Examples', icon: examplesIcon },
};

export function isDocsSectionId(value: string): value is DocsSectionId {
	return DOCS_SECTION_ORDER_INDEX.has(value);
}

export const docsFrontmatterSchema = z.object({
	title: z.string(),
	description: z.string(),
	order: z.optional(z.coerce.number()),
	/** Set to `false` to leave the page out of `llms.txt` and the Markdown exports. */
	llms: z.optional(z.boolean()),
});

export type DocsFrontmatter = z.infer<typeof docsFrontmatterSchema>;

export type DocsContentEntry = ContentEntry<DocsFrontmatter>;

/** Sorts entries by configured section order, then frontmatter `order`. */
export function compareDocsEntries(a: DocsContentEntry, b: DocsContentEntry): number {
	const sectionA = DOCS_SECTION_ORDER_INDEX.get(a.segments[0] ?? '') ?? Number.MAX_SAFE_INTEGER;
	const sectionB = DOCS_SECTION_ORDER_INDEX.get(b.segments[0] ?? '') ?? Number.MAX_SAFE_INTEGER;

	if (sectionA !== sectionB) {
		return sectionA - sectionB;
	}

	return (a.order ?? 0) - (b.order ?? 0);
}

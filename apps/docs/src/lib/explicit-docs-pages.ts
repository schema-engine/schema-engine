import type { DocsFrontmatter } from '@/content/docs';

export type DocsPageEntry = DocsFrontmatter & {
	slug: string;
	segments: string[];
};

export const reactDocsPages = {
	'getting-started': {
		slug: 'forms-react/getting-started',
		segments: ['forms-react', 'getting-started'],
		title: 'Getting Started',
		description: 'Install the React adapter and register your engine.',
		group: 'Forms React',
		order: 2,
	},
	layouts: {
		slug: 'forms-react/layouts',
		segments: ['forms-react', 'layouts'],
		title: 'View recipes',
		description: 'Card, wizard, and other view recipes for form chrome.',
		group: 'Forms React',
		order: 4,
	},
} satisfies Record<string, DocsPageEntry>;

export const explicitDocsPages: readonly DocsPageEntry[] = Object.values(reactDocsPages);

/** @remarks Explicit pages replace content entries with the same slug. */
export function mergeDocsPages(content: readonly DocsPageEntry[], pages: readonly DocsPageEntry[]): DocsPageEntry[] {
	return Array.from(new Map([...content, ...pages].map((entry) => [entry.slug, entry])).values()).toSorted(
		(a, b) => (a.order ?? 0) - (b.order ?? 0) || a.slug.localeCompare(b.slug),
	);
}

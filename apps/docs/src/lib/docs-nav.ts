import { DOCS_GROUP_ORDER_INDEX, DOCS_ROOT } from '@/content/docs';
import { entries } from 'ecopages:content/docs';
import { explicitDocsPages, mergeDocsPages } from './explicit-docs-pages';
import { buildGroupedNav } from './content-nav';

export const docsNav = buildGroupedNav(mergeDocsPages(entries, explicitDocsPages), {
	rootDir: DOCS_ROOT,
	groupOrder: DOCS_GROUP_ORDER_INDEX,
});

import { DOCS_GROUP_ORDER_INDEX, DOCS_ROOT } from '@/content/docs';
import { entries } from 'ecopages:content/docs';
import { buildGroupedNav } from './content-nav';

export const docsNav = buildGroupedNav(entries, {
	rootDir: DOCS_ROOT,
	groupOrder: DOCS_GROUP_ORDER_INDEX,
});

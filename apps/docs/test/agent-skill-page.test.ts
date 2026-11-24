import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test } from 'vitest';
import { DOCS_SECTION_ORDER } from '../src/content/docs';
import { findSkillSources } from '../scripts/skill-sources';

const sources = await findSkillSources();
const router = readFileSync(sources.router, 'utf8');
const page = readFileSync(join(import.meta.dirname, '../src/content/docs/schema-engine/agent-skill.mdx'), 'utf8');

const referencesIn = (text: string): string[] =>
	[...text.matchAll(/`(reference\/[\w-]+\.md)`/g)].map((match) => match[1]!).toSorted();

test('the page lists exactly the references the packages ship, as the router routes to them', () => {
	const shipped = sources.references.map(({ name }) => `reference/${name}`).toSorted();
	expect(referencesIn(page)).toEqual(shipped);
	expect(referencesIn(router)).toEqual(shipped);
});

test('the page names where the router and a reference are installed and where the site serves them', () => {
	expect(page).toContain('node_modules/@schema-engine/<package>/skill/SKILL.md');
	expect(page).toContain('node_modules/@schema-engine/<package>/skill/reference/<file>');
	expect(page).toContain('/skill/SKILL.md');
	expect(page).toContain('/skill/reference/');
});

test('the router documentation map lists every docs section in sidebar order, each at an existing page', () => {
	const paths = [...router.matchAll(/`(\/docs\/[\w-]+\/[\w-]+)`/g)].map((match) => match[1]!);
	expect(paths.map((path) => path.split('/')[2])).toEqual([...DOCS_SECTION_ORDER]);
	for (const path of paths) {
		expect(existsSync(join(import.meta.dirname, '../src/content', `${path}.mdx`)), `${path} has no page`).toBe(
			true,
		);
	}
});

import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test } from 'vitest';
import { DOCS_SECTION_ORDER } from '../src/content/docs';

const skillRoot = join(import.meta.dirname, '../../../packages/forms/skill');
const page = readFileSync(join(import.meta.dirname, '../src/content/docs/schema-engine/agent-skill.mdx'), 'utf8');

const referencesIn = (text: string): string[] =>
	[...text.matchAll(/`(reference\/[\w-]+\.md)`/g)].map((match) => match[1]!).toSorted();

test('the page lists exactly the references the router routes to', () => {
	const router = readFileSync(join(skillRoot, 'SKILL.md'), 'utf8');
	expect(referencesIn(page)).toEqual(referencesIn(router));
	for (const reference of referencesIn(page)) expect(existsSync(join(skillRoot, reference))).toBe(true);
});

test('the skill folder has no reference the page does not name', () => {
	const files = readdirSync(join(skillRoot, 'reference')).map((name) => `reference/${name}`);
	expect(referencesIn(page)).toEqual(files.toSorted());
});

test('the page names the installed copy and the served copy', () => {
	expect(page).toContain('node_modules/@schema-engine/forms/skill/SKILL.md');
	expect(page).toContain('/skill/SKILL.md');
	expect(existsSync(join(skillRoot, 'SKILL.md'))).toBe(true);
});

test('the router documentation map lists every docs section in sidebar order, each at an existing page', () => {
	const router = readFileSync(join(skillRoot, 'SKILL.md'), 'utf8');
	const paths = [...router.matchAll(/`(\/docs\/[\w-]+\/[\w-]+)`/g)].map((match) => match[1]!);
	expect(paths.map((path) => path.split('/')[2])).toEqual([...DOCS_SECTION_ORDER]);
	for (const path of paths) {
		expect(existsSync(join(import.meta.dirname, '../src/content', `${path}.mdx`)), `${path} has no page`).toBe(
			true,
		);
	}
});

import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test } from 'vitest';

const skillRoot = join(import.meta.dirname, '../../../packages/forms/skill');
const page = readFileSync(join(import.meta.dirname, '../src/content/docs/forms/agent-skill.mdx'), 'utf8');

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

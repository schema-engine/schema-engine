import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from 'vitest';
import { filesUnder } from '../../../test-utils/packed-skill';
import { findSkillSources, PACKAGES_ROOT } from '../scripts/skill-sources';

const examplesRoot = path.join(import.meta.dirname, '../../../test-utils/skill-examples');
const read = (file: string) => readFileSync(file, 'utf8');

const sources = await findSkillSources();
const router = read(sources.router);
const packageNames = readdirSync(PACKAGES_ROOT)
	.filter((folder) => existsSync(path.join(PACKAGES_ROOT, folder, 'package.json')))
	.toSorted();

/** The routing table's rows: the package and the reference a task is routed to. */
const routes = [
	...router.matchAll(/^\|[^|\n]*\|\s*`@schema-engine\/([\w-]+)`\s*\|\s*`reference\/([\w-]+\.md)`\s*\|$/gm),
].map((match) => ({ package: match[1] ?? '', name: match[2] ?? '' }));
const shipped = sources.references.map(({ package: pkg, name }) => ({ package: pkg, name }));

const owned = (list: { package: string; name: string }[]) =>
	list.map(({ package: pkg, name }) => `${pkg}/${name}`).toSorted();

interface Fence {
	readonly file: string;
	readonly lang: string;
	readonly title: string | undefined;
	readonly body: string;
}

function fencesOf(file: string, text: string): Fence[] {
	return [...text.matchAll(/^```(\w*)(?: title="([^"]+)")?\n([\s\S]*?)\n```$/gm)].map((match) => ({
		file,
		lang: match[1] ?? '',
		title: match[2],
		body: match[3] ?? '',
	}));
}

const referenceTexts = sources.references.map((reference) => ({ ...reference, text: read(reference.file) }));
const fences = referenceTexts.flatMap(({ name, text }) => fencesOf(name, text));

describe('the router and the references the packages ship', () => {
	test('routes to exactly the references the packages ship, each owned by its package', () => {
		expect(routes.length).toBeGreaterThan(0);
		expect(owned(routes)).toEqual(owned(shipped));
	});

	test('names every reference after its package, and ships nothing else in a skill folder', () => {
		for (const { package: pkg, name } of sources.references) {
			expect(name === `${pkg}.md` || name.startsWith(`${pkg}-`), `${pkg}/${name}`).toBe(true);
		}
		for (const pkg of packageNames) {
			const root = path.join(PACKAGES_ROOT, pkg, 'skill');
			if (!existsSync(root)) continue;
			const expected = [
				'SKILL.md',
				...sources.references
					.filter((reference) => reference.package === pkg)
					.map(({ name }) => `reference/${name}`),
			];
			expect(filesUnder(root), pkg).toEqual(expected.toSorted());
		}
	});

	test('every package that ships a skill carries a copy of the router, which its build makes from the one source', () => {
		for (const pkg of packageNames) {
			const root = path.join(PACKAGES_ROOT, pkg, 'skill');
			if (!existsSync(root)) continue;
			expect(read(path.join(root, 'SKILL.md')), pkg).toBe(router);
		}
	});

	test('every package ships a reference, so the router can route to it', () => {
		const owners = new Set(sources.references.map(({ package: pkg }) => pkg));
		expect([...owners].toSorted()).toEqual(packageNames);
	});

	test('lists every package in its table', () => {
		const table = router.split('## Packages')[1]?.split('\n## ')[0] ?? '';
		const listed = [...table.matchAll(/^\| `@schema-engine\/([\w-]+)`/gm)].map((match) => match[1] ?? '');
		expect(listed.toSorted()).toEqual(packageNames);
	});

	test('names the skill, calls forms-radiant a renderer and describes actions as sequences with groups', () => {
		expect(router).toMatch(/^---\nname: schema-engine\n/);
		expect(router).not.toMatch(/\badapter\b/i);
		expect(router).toMatch(/`@schema-engine\/forms-radiant`\s*\|\s*Radiant renderer/);
		expect(router).not.toMatch(/sequential/i);
		expect(router).toMatch(/inner array is a parallel group/);
	});

	test('defines the concepts once: no reference repeats a definition', () => {
		const definitions = ['## Core concepts', '## Forms concepts'].flatMap((heading) => {
			const section = router.split(heading)[1]?.split('\n## ')[0] ?? '';
			return [...section.matchAll(/^- \*\*[^*]+\*\*: (.+)$/gm)].map((match) => match[1] ?? '');
		});
		expect(definitions).toHaveLength(8);
		for (const { text } of referenceTexts) {
			expect(text).not.toMatch(/^#+ Core concepts/im);
			for (const definition of definitions) expect(text).not.toContain(definition.slice(0, 48));
		}
	});
});

describe('the code in the skill', () => {
	test.each(referenceTexts.map(({ name, text }) => [name, text] as const))(
		'%s: every fence marker belongs to a block the test parsed, so none is skipped',
		(name, text) => {
			const markers = text.split('\n').filter((line) => /^\s*(?:`{3,}|~{3,})/.test(line));
			expect(markers).toHaveLength(2 * fencesOf(name, text).length);
		},
	);

	test('every typescript block is a mirror of a real example file, tagged with its path', () => {
		const code = fences.filter(({ lang }) => ['ts', 'tsx', 'typescript', 'js', 'jsx'].includes(lang));
		expect(code.length).toBeGreaterThan(10);
		expect(code.filter(({ title }) => title === undefined).map(({ file }) => file)).toEqual([]);
	});

	test.each(fences.filter(({ title }) => title !== undefined))(
		'$file: $title matches the file, so the example the tests run is the one the reference shows',
		({ title, body }) => {
			const source = read(path.join(examplesRoot, title ?? ''));
			expect(body.trimEnd()).toBe(source.trimEnd());
		},
	);

	test('every example file is shown by a reference', () => {
		const shown = new Set(fences.map(({ title }) => title));
		expect(filesUnder(examplesRoot).filter((file) => !shown.has(file))).toEqual([]);
	});

	test('the other blocks are shell, css or text', () => {
		const others = fences.filter(({ title }) => title === undefined).map(({ lang }) => lang);
		expect(others.filter((lang) => !['bash', 'css', 'text', ''].includes(lang))).toEqual([]);
	});
});

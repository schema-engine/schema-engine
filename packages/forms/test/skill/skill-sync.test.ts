import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, test } from 'vitest';

const packageRoot = fileURLToPath(new URL('../../', import.meta.url));
const skillRoot = path.join(packageRoot, 'skill');
const examplesRoot = path.join(packageRoot, '../../test-utils/skill-examples');

const read = (file: string) => readFileSync(file, 'utf8');
const skill = read(path.join(skillRoot, 'SKILL.md'));

/** The references the router names, in the order it first names them. */
const REFERENCES = [...new Set([...skill.matchAll(/reference\/([\w-]+\.md)/g)].map((match) => match[1] ?? ''))];
const references = Object.fromEntries(
	REFERENCES.filter((name) => existsSync(path.join(skillRoot, 'reference', name))).map(
		(name) => [name, read(path.join(skillRoot, 'reference', name))] as const,
	),
);

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

const fences = Object.entries(references).flatMap(([name, text]) => fencesOf(name, text));

function filesUnder(root: string): string[] {
	return readdirSync(root, { recursive: true, withFileTypes: true })
		.filter((entry) => entry.isFile())
		.map((entry) => path.relative(root, path.join(entry.parentPath, entry.name)));
}

describe('the skill folder', () => {
	test('has SKILL.md and exactly the references the router names', () => {
		expect(filesUnder(skillRoot).toSorted()).toEqual(
			['SKILL.md', ...REFERENCES.map((name) => `reference/${name}`)].toSorted(),
		);
	});

	test('routes to references that all exist', () => {
		expect(REFERENCES.length).toBeGreaterThan(0);
		expect(REFERENCES.filter((name) => !(name in references))).toEqual([]);
	});

	test('names the skill, calls forms-radiant a renderer and maps its docs', () => {
		expect(skill).toMatch(/^---\nname: schema-engine\n/);
		expect(skill).not.toMatch(/\badapter\b/i);
		expect(skill).toContain('`@schema-engine/forms-radiant` | Radiant renderer');
		expect(skill).toContain('/docs/forms-radiant/overview');
	});

	test('defines the core concepts once: no reference repeats a definition', () => {
		const section = skill.split('## Core concepts')[1]?.split('\n## ')[0] ?? '';
		const definitions = [...section.matchAll(/^- \*\*[^*]+\*\*: (.+)$/gm)].map((match) => match[1] ?? '');
		expect(definitions).toHaveLength(4);
		for (const text of Object.values(references)) {
			expect(text).not.toMatch(/^#+ Core concepts/im);
			for (const definition of definitions) expect(text).not.toContain(definition.slice(0, 48));
		}
	});
});

describe('the code in the skill', () => {
	test.each(Object.entries(references))(
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
		const unshown = filesUnder(examplesRoot).filter((file) => !shown.has(file.split(path.sep).join('/')));
		expect(unshown).toEqual([]);
	});

	test('the other blocks are shell, css or text', () => {
		const others = fences.filter(({ title }) => title === undefined).map(({ lang }) => lang);
		expect(others.filter((lang) => !['bash', 'css', 'text', ''].includes(lang))).toEqual([]);
	});
});

describe('the packed package', () => {
	test('contains the skill folder, built beside the entry points it describes', () => {
		const out = mkdtempSync(path.join(tmpdir(), 'forms-pack-'));
		try {
			execFileSync('pnpm', ['pack', '--pack-destination', out], { cwd: packageRoot, stdio: 'pipe' });
			const [tarball] = readdirSync(out);
			const listing = execFileSync('tar', ['-tzf', path.join(out, tarball ?? '')], { encoding: 'utf8' })
				.split('\n')
				.filter(Boolean);

			for (const file of ['SKILL.md', ...REFERENCES.map((name) => `reference/${name}`)]) {
				expect(listing).toContain(`package/skill/${file}`);
			}
			expect(listing).toContain('package/dist/testing/index.js');
		} finally {
			rmSync(out, { recursive: true, force: true });
		}
	});
});

import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, expect, test } from 'vitest';
import { copySkill } from './copy-skill';
import { findSkillSources } from './skill-sources';

const folders: string[] = [];

afterEach(async () => {
	await Promise.all(folders.splice(0).map((folder) => rm(folder, { recursive: true, force: true })));
});

async function scratch(): Promise<string> {
	const folder = await mkdtemp(join(tmpdir(), 'skill-'));
	folders.push(folder);
	return folder;
}

async function filesUnder(root: string): Promise<string[]> {
	const entries = await readdir(root, { recursive: true, withFileTypes: true });
	return entries
		.filter((entry) => entry.isFile())
		.map((entry) => join(entry.parentPath, entry.name).slice(root.length + 1))
		.toSorted();
}

async function write(file: string, text = '# Title'): Promise<void> {
	await mkdir(join(file, '..'), { recursive: true });
	await writeFile(file, text);
}

test('serves the router of the registry package and every package reference, file for file, and indexes each', async () => {
	const output = await scratch();
	const sources = await findSkillSources();
	await copySkill(output, sources);

	expect(sources.references.map(({ package: pkg }) => pkg)).toEqual(
		expect.arrayContaining(['registry', 'actions', 'layout', 'forms', 'forms-react', 'forms-radiant']),
	);
	expect(await filesUnder(join(output, 'skill'))).toEqual(
		['SKILL.md', ...sources.references.map(({ name }) => join('reference', name))].toSorted(),
	);
	expect(await readFile(join(output, 'skill', 'SKILL.md'), 'utf8')).toBe(await readFile(sources.router, 'utf8'));
	const index = await readFile(join(output, 'skill.txt'), 'utf8');
	expect(index).toContain('/skill/SKILL.md');
	for (const { name, file } of sources.references) {
		expect(await readFile(join(output, 'skill', 'reference', name), 'utf8')).toBe(await readFile(file, 'utf8'));
		expect(index).toContain(`/skill/reference/${name}`);
	}
});

test('replaces what an earlier copy left, so a deleted reference is not served', async () => {
	const output = await scratch();
	const sources = await findSkillSources();
	await copySkill(output, sources);
	await writeFile(join(output, 'skill', 'reference', 'stale.md'), '# Stale');

	await copySkill(output, sources);

	expect(await filesUnder(join(output, 'skill'))).not.toContain(join('reference', 'stale.md'));
});

test('refuses a reference name two packages ship', async () => {
	const packages = await scratch();
	await write(join(packages, 'registry', 'skill', 'SKILL.md'));
	await write(join(packages, 'actions', 'skill', 'reference', 'shared.md'));
	await write(join(packages, 'forms', 'skill', 'reference', 'shared.md'));
	await expect(findSkillSources(packages)).rejects.toThrow('shared.md is shipped by actions and by forms');
});

test('serves the router of the registry package, whatever copy of it another package holds, even a stale one', async () => {
	const packages = await scratch();
	await write(join(packages, 'registry', 'skill', 'SKILL.md'), '# The router');
	await write(join(packages, 'actions', 'skill', 'SKILL.md'), '# A router an earlier build copied');
	await write(join(packages, 'actions', 'skill', 'reference', 'actions.md'));

	const sources = await findSkillSources(packages);

	expect(sources.references.map(({ name }) => name)).toEqual(['actions.md']);
	expect(sources.router).toBe(join(packages, 'registry', 'skill', 'SKILL.md'));
});

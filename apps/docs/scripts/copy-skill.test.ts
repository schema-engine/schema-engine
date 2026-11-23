import { mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, expect, test } from 'vitest';
import { SKILL_SOURCE, copySkill } from './copy-skill';

let output: string;

afterEach(() => rm(output, { recursive: true, force: true }));

async function filesUnder(root: string): Promise<string[]> {
	const entries = await readdir(root, { recursive: true, withFileTypes: true });
	return entries
		.filter((entry) => entry.isFile())
		.map((entry) => join(entry.parentPath, entry.name).slice(root.length + 1))
		.toSorted();
}

test('serves the skill the package ships, file for file, and indexes every reference', async () => {
	output = await mkdtemp(join(tmpdir(), 'skill-'));
	await copySkill(output);

	expect(await filesUnder(join(output, 'skill'))).toEqual(await filesUnder(SKILL_SOURCE));
	for (const file of await filesUnder(SKILL_SOURCE)) {
		expect(await readFile(join(output, 'skill', file), 'utf8')).toBe(
			await readFile(join(SKILL_SOURCE, file), 'utf8'),
		);
	}
	const index = await readFile(join(output, 'skill.txt'), 'utf8');
	expect(index).toContain('/skill/SKILL.md');
	for (const name of await readdir(join(SKILL_SOURCE, 'reference')))
		expect(index).toContain(`/skill/reference/${name}`);
});

test('replaces what an earlier copy left, so a deleted reference is not served', async () => {
	output = await mkdtemp(join(tmpdir(), 'skill-'));
	await copySkill(output);
	await writeFile(join(output, 'skill', 'reference', 'stale.md'), '# Stale');

	await copySkill(output);

	expect(await filesUnder(join(output, 'skill'))).not.toContain(join('reference', 'stale.md'));
});

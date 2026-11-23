import { cp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { absoluteUrl } from '../src/lib/docs/site-meta';

const repoRoot = join(import.meta.dirname, '../../..');
const publicRoot = join(import.meta.dirname, '../src/public');

/** The one source of the agent skill: the folder `@schema-engine/forms` ships. */
export const SKILL_SOURCE = join(repoRoot, 'packages/forms/skill');

/** The title of a reference, from its first heading. */
async function titleOf(file: string): Promise<string> {
	const text = await readFile(file, 'utf8');
	return /^# (.+)$/m.exec(text)?.[1] ?? file;
}

/**
 * Serves the skill the package ships at `/skill/`, with `/skill.txt` as its index.
 *
 * @remarks
 * The copy is derived and replaced on every run, so the site always serves the skill of the package in this repository, the latest version. Nothing under `skill/` or `skill.txt` in the public folder is edited by hand.
 */
export async function copySkill(outputRoot = publicRoot, sourceRoot = SKILL_SOURCE): Promise<void> {
	const target = join(outputRoot, 'skill');
	await rm(target, { recursive: true, force: true });
	await mkdir(outputRoot, { recursive: true });
	await cp(sourceRoot, target, { recursive: true });

	const references = (await readdir(join(sourceRoot, 'reference'))).toSorted();
	const lines = [
		'# Schema Engine — agent skill index',
		'',
		'This file points an AI agent to the skill of Schema Engine, a JSON-driven form layer on top of the Ecopages framework.',
		'',
		'## How to use this file',
		'',
		'- This `skill.txt` file is an index only.',
		'- Read `SKILL.md` first: it defines the core concepts and routes each task to one reference.',
		'- Read a reference only when the task needs it.',
		'',
		'## Skills',
		'',
		`- [SKILL.md](${absoluteUrl('/skill/SKILL.md')}): the core concepts and the router`,
		...(await Promise.all(
			references.map(
				async (name) =>
					`- [${await titleOf(join(sourceRoot, 'reference', name))}](${absoluteUrl(`/skill/reference/${name}`)})`,
			),
		)),
		'',
	];
	await writeFile(join(outputRoot, 'skill.txt'), lines.join('\n'));
	console.log(`[skill] Copied the skill to ${target}`);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
	await copySkill();
}

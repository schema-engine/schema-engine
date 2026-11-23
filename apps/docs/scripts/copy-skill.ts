import { copyFile, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { absoluteUrl } from '../src/lib/docs/site-meta';
import { findSkillSources, type SkillSources } from './skill-sources';

const publicRoot = join(import.meta.dirname, '../src/public');

/** The title of a reference, from its first heading. */
async function titleOf(file: string): Promise<string> {
	const text = await readFile(file, 'utf8');
	return /^# (.+)$/m.exec(text)?.[1] ?? file;
}

/**
 * Serves the skill the packages ship at `/skill/`, with `/skill.txt` as its index.
 *
 * @remarks
 * The router is copied to `/skill/SKILL.md` and each package's references to `/skill/reference/`. The copy is derived and replaced on every run, so the site always serves the skills of the packages in this repository, the latest version. Nothing under `skill/` or `skill.txt` in the public folder is edited by hand.
 */
export async function copySkill(outputRoot = publicRoot, sources?: SkillSources): Promise<void> {
	const { router, references } = sources ?? (await findSkillSources());
	const target = join(outputRoot, 'skill');
	await rm(target, { recursive: true, force: true });
	await mkdir(join(target, 'reference'), { recursive: true });
	await copyFile(router, join(target, 'SKILL.md'));
	for (const { name, file } of references) await copyFile(file, join(target, 'reference', name));

	const lines = [
		'# Schema Engine — agent skill index',
		'',
		'This file points an AI agent to the skill of Schema Engine, a common language for declarative interfaces with forms as its first domain, on top of the Ecopages framework.',
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
				async ({ name, file }) => `- [${await titleOf(file)}](${absoluteUrl(`/skill/reference/${name}`)})`,
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

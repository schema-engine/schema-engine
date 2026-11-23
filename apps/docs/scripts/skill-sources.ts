import { readdir } from 'node:fs/promises';
import { join } from 'node:path';

const repoRoot = join(import.meta.dirname, '../../..');

/** The folder that holds the packages. */
export const PACKAGES_ROOT = join(repoRoot, 'packages');

/** The package that ships the router: the one every other package depends on. */
export const ROUTER_PACKAGE = 'registry';

/** One reference of the skill, shipped by the package that owns it. */
export interface SkillReference {
	/** The package folder under `packages/`, such as `forms-react`. */
	readonly package: string;
	/** The file name inside `skill/reference/`, such as `forms-react.md`. */
	readonly name: string;
	/** The absolute path of the file. */
	readonly file: string;
}

/** The router and the references of the skill, as the packages ship them. */
export interface SkillSources {
	readonly router: string;
	readonly references: readonly SkillReference[];
}

async function listOrEmpty(folder: string): Promise<string[]> {
	try {
		return (await readdir(folder)).toSorted();
	} catch {
		return [];
	}
}

/**
 * Finds the one skill the packages ship: the router of {@link ROUTER_PACKAGE} and every `skill/reference/*.md` of every package.
 *
 * @remarks
 * The references are served flat, so a name must be unique across packages. A package other than the router's with a `SKILL.md`
 * is an error, because a skill has one router.
 */
export async function findSkillSources(packagesRoot = PACKAGES_ROOT): Promise<SkillSources> {
	const references: SkillReference[] = [];
	for (const pkg of await listOrEmpty(packagesRoot)) {
		const skillRoot = join(packagesRoot, pkg, 'skill');
		if (pkg !== ROUTER_PACKAGE && (await listOrEmpty(skillRoot)).includes('SKILL.md')) {
			throw new Error(`packages/${pkg}/skill/SKILL.md: the router lives in packages/${ROUTER_PACKAGE} only.`);
		}
		for (const name of await listOrEmpty(join(skillRoot, 'reference'))) {
			const clash = references.find((reference) => reference.name === name);
			if (clash) throw new Error(`The reference ${name} is shipped by ${clash.package} and by ${pkg}.`);
			references.push({ package: pkg, name, file: join(skillRoot, 'reference', name) });
		}
	}
	return { router: join(packagesRoot, ROUTER_PACKAGE, 'skill', 'SKILL.md'), references };
}

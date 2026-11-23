import { execFileSync } from 'node:child_process';
import { mkdtempSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { expect } from 'vitest';

/** The files under a folder, relative to it, with `/` separators. */
export function filesUnder(root: string): string[] {
	return readdirSync(root, { recursive: true, withFileTypes: true })
		.filter((entry) => entry.isFile())
		.map((entry) => path.relative(root, path.join(entry.parentPath, entry.name)).split(path.sep).join('/'))
		.toSorted();
}

/**
 * Packs the package at `packageRoot` and expects its tarball to hold every file of its `skill` folder.
 *
 * @remarks
 * The expected files come from the folder on disk, so a file the package's `files` leaves out fails the test.
 */
export function expectPackedSkill(packageRoot: string): void {
	const skillFiles = filesUnder(path.join(packageRoot, 'skill'));
	expect(skillFiles.length).toBeGreaterThan(0);

	const out = mkdtempSync(path.join(tmpdir(), 'skill-pack-'));
	try {
		execFileSync('pnpm', ['pack', '--pack-destination', out], { cwd: packageRoot, stdio: 'pipe' });
		const [tarball] = readdirSync(out);
		const listing = execFileSync('tar', ['-tzf', path.join(out, tarball ?? '')], { encoding: 'utf8' })
			.split('\n')
			.filter(Boolean);

		for (const file of skillFiles) expect(listing).toContain(`package/skill/${file}`);
	} finally {
		rmSync(out, { recursive: true, force: true });
	}
}

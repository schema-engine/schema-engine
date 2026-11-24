import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { expect, test } from 'vitest';
import { expectPackedSkill } from '../../../test-utils/packed-skill';
import { PACKAGES_ROOT } from '../scripts/skill-sources';

const packages = readdirSync(PACKAGES_ROOT).filter((folder) => existsSync(path.join(PACKAGES_ROOT, folder, 'skill')));

test('every package that ships a skill publishes its skill folder', () => {
	expect(packages.length).toBeGreaterThan(1);
	for (const folder of packages) {
		const { files } = JSON.parse(readFileSync(path.join(PACKAGES_ROOT, folder, 'package.json'), 'utf8')) as {
			files: string[];
		};
		expect(files, folder).toContain('/skill');
	}
});

test('a packed package holds every file of its skill folder, the router copy and the references', () => {
	expectPackedSkill(path.join(PACKAGES_ROOT, 'forms'));
});

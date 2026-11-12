import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { describe, expect, test } from 'vitest';

const packageRoot = resolve(__dirname, '..');

function sourceFiles(directory: string): string[] {
	return readdirSync(directory).flatMap((entry) => {
		const path = join(directory, entry);
		return statSync(path).isDirectory() ? sourceFiles(path) : path.endsWith('.ts') ? [path] : [];
	});
}

describe('the layout package boundary', () => {
	test('package.json declares no dependency on forms', () => {
		const manifest = JSON.parse(readFileSync(join(packageRoot, 'package.json'), 'utf8')) as Record<
			string,
			Record<string, string> | undefined
		>;
		const declared = ['dependencies', 'devDependencies', 'peerDependencies', 'optionalDependencies'].flatMap(
			(field) => Object.keys(manifest[field] ?? {}),
		);
		expect(declared.filter((name) => name.startsWith('@schema-engine/forms'))).toEqual([]);
	});

	test('no source file imports forms', () => {
		const importing = sourceFiles(join(packageRoot, 'src')).filter((file) =>
			/from\s+['"]@schema-engine\/forms/.test(readFileSync(file, 'utf8')),
		);
		expect(importing).toEqual([]);
	});
});

import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, test } from 'vitest';

const packages = fileURLToPath(new URL('../../../', import.meta.url));

test('package sources route diagnostics through tagged loggers', () => {
	const directConsoleFiles: string[] = [];
	for (const name of readdirSync(packages)) {
		const source = path.join(packages, name, 'src');
		for (const file of readdirSync(source, { recursive: true, withFileTypes: true })) {
			if (!file.isFile()) continue;
			const filename = path.join(file.parentPath, file.name);
			if (filename.split(path.sep).includes('stories') || /\.(test|spec)\./.test(filename)) continue;
			if (/console\./.test(readFileSync(filename, 'utf8'))) directConsoleFiles.push(filename);
		}
	}
	expect(directConsoleFiles).toEqual([]);
});

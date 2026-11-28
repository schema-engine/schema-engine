import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';

function sourceMaps(dir: string): string[] {
	return readdirSync(dir).flatMap((name) => {
		const file = path.join(dir, name);
		if (statSync(file).isDirectory()) return sourceMaps(file);
		return file.endsWith('.js.map') ? [file] : [];
	});
}

/**
 * The source modules of a built package that more than one file of its `dist` contains, with the files.
 *
 * @param packageDir - The package folder, whose `dist` is read, so the check runs after `build:lib`
 *
 * @remarks
 * A build that bundles each entry by itself copies every module two entries share into both. Each copy is a module of
 * its own at run time: a class is two classes, so an error thrown through one entry is not an `instanceof` the class
 * another entry exports, and a module-level `Symbol()` or `WeakMap` is two. The sources of each file are read from its
 * source map. A package whose build splits its output holds each module in one file, shared code in a chunk, so the
 * result is empty.
 */
export function modulesBundledTwice(packageDir: string): Array<{ source: string; files: string[] }> {
	const dist = path.join(packageDir, 'dist');
	const files = new Map<string, string[]>();
	for (const mapFile of sourceMaps(dist)) {
		const map = JSON.parse(readFileSync(mapFile, 'utf8')) as { sources: string[] };
		for (const source of map.sources) {
			const absolute = path.relative(packageDir, path.resolve(path.dirname(mapFile), source));
			files.set(absolute, [...(files.get(absolute) ?? []), path.relative(dist, mapFile)]);
		}
	}
	return [...files].filter(([, owners]) => owners.length > 1).map(([source, owners]) => ({ source, files: owners }));
}

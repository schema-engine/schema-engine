import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';

function scriptsOf(dir: string): string[] {
	return readdirSync(dir).flatMap((name) => {
		const file = path.join(dir, name);
		if (statSync(file).isDirectory()) return scriptsOf(file);
		return file.endsWith('.js') ? [file] : [];
	});
}

/**
 * The source modules of a built package that more than one file of its `dist` contains, with the files.
 *
 * @param packageDir - The package folder, whose `dist` is read, so the check runs after `build:lib`
 * @throws {Error} When `dist` holds no script, or a script has no source map, since a file the check cannot read
 * would pass it without being checked
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
	const scripts = scriptsOf(dist);
	if (scripts.length === 0)
		throw new Error(`${dist} holds no script, so there is nothing to check. Build the package.`);
	const files = new Map<string, string[]>();
	for (const script of scripts) {
		const mapFile = `${script}.map`;
		if (!existsSync(mapFile)) {
			throw new Error(
				`${path.relative(packageDir, script)} has no source map, so the check cannot read its modules.`,
			);
		}
		const map = JSON.parse(readFileSync(mapFile, 'utf8')) as { sources: string[] };
		for (const source of map.sources) {
			const absolute = path.relative(packageDir, path.resolve(path.dirname(mapFile), source));
			files.set(absolute, [...(files.get(absolute) ?? []), path.relative(dist, mapFile)]);
		}
	}
	return [...files].filter(([, owners]) => owners.length > 1).map(([source, owners]) => ({ source, files: owners }));
}

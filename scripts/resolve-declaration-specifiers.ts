import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const RELATIVE_SPECIFIER = /(\bfrom\s+|\bimport\s*\(\s*|\bimport\s+)(['"])(\.{1,2}\/[^'"]*|\.{1,2})\2/g;
const NOT_A_MODULE_EXTENSION = /\.(css|json|svg|png)$/;

function declarationsOf(dir: string): string[] {
	return readdirSync(dir).flatMap((name) => {
		const file = path.join(dir, name);
		if (statSync(file).isDirectory()) return declarationsOf(file);
		return file.endsWith('.d.ts') ? [file] : [];
	});
}

/**
 * The specifier a declaration file writes for a relative import, with the extension `node16` and `nodenext` module
 * resolution require: `./types` becomes `./types.js`, `./recipes` becomes `./recipes/index.js`.
 *
 * @param file - The declaration file that holds the import
 * @param specifier - The relative specifier it writes
 * @throws {Error} When no declaration file the specifier could name exists, since the emitted package would not resolve
 */
export function fullSpecifier(file: string, specifier: string): string {
	if (NOT_A_MODULE_EXTENSION.test(specifier)) return specifier;
	if (specifier.endsWith('.d.ts')) return `${specifier.slice(0, -'.d.ts'.length)}.js`;
	if (specifier.endsWith('.js')) return specifier;
	const target = path.resolve(path.dirname(file), specifier);
	if (existsSync(`${target}.d.ts`)) return `${specifier}.js`;
	if (existsSync(path.join(target, 'index.d.ts'))) return `${specifier.replace(/\/$/, '')}/index.js`;
	throw new Error(`${file} imports '${specifier}', which names no declaration file.`);
}

/**
 * Writes the extension of every relative import of the declaration files under a directory, in place.
 *
 * @param dir - The folder `tsc` emitted its declarations to, after `tsc-alias` rewrote the path aliases
 * @returns The files it changed
 *
 * @remarks
 * `tsc` writes a relative import as the source wrote it, and the sources import `./types`. A package that declares
 * `"type": "module"` is read by `node16` and `nodenext` resolution as ESM, which refuses a relative import without an
 * extension, so a consumer would find the package's entry exporting nothing. `tsc` has no option to write the
 * extension, so this step does, once, for every package. Comment lines are left as they are, since a TSDoc example may
 * write an import of its own.
 */
export function resolveDeclarationSpecifiers(dir: string): string[] {
	const changed: string[] = [];
	for (const file of declarationsOf(dir)) {
		const source = readFileSync(file, 'utf8');
		const written = source
			.split('\n')
			.map((line) =>
				/^\s*(\*|\/\/|\/\*)/.test(line)
					? line
					: line.replace(
							RELATIVE_SPECIFIER,
							(_match, lead: string, quote: string, specifier: string) =>
								`${lead}${quote}${fullSpecifier(file, specifier)}${quote}`,
						),
			)
			.join('\n');
		if (written === source) continue;
		writeFileSync(file, written);
		changed.push(file);
	}
	return changed;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
	const dir = path.resolve(process.cwd(), process.argv[2] ?? 'dist');
	if (!existsSync(dir)) throw new Error(`${dir} does not exist. Build the declarations first.`);
	resolveDeclarationSpecifiers(dir);
}

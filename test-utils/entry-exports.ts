import { readFileSync } from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

/**
 * Every symbol each entry of a package's `exports` map exposes, values and types, by the declaration it resolves to.
 *
 * @remarks
 * An entry is read at the source file its `dist` path is built from, so the check needs no build. A re-export
 * names the same declaration as the original, so a symbol exported under the same name from two entries
 * is found whichever file declares it.
 */
function exportsByEntry(packageDir: string): Map<string, string[]> {
	const { exports: exportMap } = JSON.parse(readFileSync(path.join(packageDir, 'package.json'), 'utf8')) as {
		exports: Record<string, string | { import?: string }>;
	};
	const entries = Object.entries(exportMap).flatMap(([key, target]) => {
		const file = typeof target === 'string' ? undefined : target.import;
		return file?.startsWith('./dist/') && file.endsWith('.js')
			? [[key, path.join(packageDir, 'src', file.slice('./dist/'.length).replace(/\.js$/, '.ts'))] as const]
			: [];
	});
	const configFile = ts.readConfigFile(path.join(packageDir, 'tsconfig.json'), (file) => ts.sys.readFile(file));
	const { options } = ts.parseJsonConfigFileContent(configFile.config, ts.sys, packageDir);
	const program = ts.createProgram(
		entries.map(([, file]) => file),
		{ ...options, noEmit: true },
	);
	const checker = program.getTypeChecker();
	const symbols = new Map<string, string[]>();
	for (const [key, file] of entries) {
		const source = program.getSourceFile(file);
		const moduleSymbol = source && checker.getSymbolAtLocation(source);
		if (!moduleSymbol) throw new Error(`Entry ${key} has no module at ${file}`);
		symbols.set(
			key,
			checker.getExportsOfModule(moduleSymbol).map((exported) => {
				const target = exported.flags & ts.SymbolFlags.Alias ? checker.getAliasedSymbol(exported) : exported;
				const declaration = target.declarations?.[0]?.getSourceFile().fileName ?? 'unknown';
				return `${path.relative(packageDir, declaration)}#${target.name}`;
			}),
		);
	}
	return symbols;
}

/**
 * The symbols a package exports from more than one entry, each with the entries that export it, so a symbol has one import path.
 *
 * @param packageDir - The package's directory, with its `package.json` and `tsconfig.json`
 */
export function symbolsSharedByEntries(packageDir: string): string[] {
	const owners = new Map<string, string[]>();
	for (const [entry, symbols] of exportsByEntry(packageDir)) {
		for (const symbol of symbols) owners.set(symbol, [...(owners.get(symbol) ?? []), entry]);
	}
	return [...owners]
		.filter(([, entries]) => entries.length > 1)
		.map(([symbol, entries]) => `${symbol}: ${entries.join(', ')}`);
}

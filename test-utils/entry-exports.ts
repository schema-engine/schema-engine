import { readFileSync } from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

interface EntrySymbol {
	/** The declaration the export resolves to, as `<file>#<declared name>`. */
	readonly declaration: string;
	/** Whether that declaration is a file of the package itself, not one of another package or a library. */
	readonly isOwn: boolean;
	/** The name the entry exports it under, which an importer writes. */
	readonly exportedAs: string;
	/** Whether an importer gets a runtime binding (a function, class or constant), not only a type. */
	readonly isValue: boolean;
}

const exportsByPackage = new Map<string, Map<string, EntrySymbol[]>>();

/**
 * Every symbol each entry of a package's `exports` map exposes, values and types, by the declaration it resolves to.
 *
 * @remarks
 * An entry is read at the source file its `dist` path is built from, so the check needs no build. A package with no
 * `exports` map has the one entry its `module` field names. A re-export
 * names the same declaration as the original, so a symbol exported under the same name from two entries
 * is found whichever file declares it. Building the TypeScript program is the whole cost, so it is built once
 * per package and every check in a test file reads the same result.
 */
function exportsByEntry(packageDir: string): Map<string, EntrySymbol[]> {
	const cached = exportsByPackage.get(packageDir);
	if (cached) return cached;
	const symbols = readExportsByEntry(packageDir);
	exportsByPackage.set(packageDir, symbols);
	return symbols;
}

function readExportsByEntry(packageDir: string): Map<string, EntrySymbol[]> {
	const manifest = JSON.parse(readFileSync(path.join(packageDir, 'package.json'), 'utf8')) as {
		exports?: Record<string, string | { import?: string }>;
		module?: string;
	};
	const exportMap = manifest.exports ?? { '.': { import: `./${manifest.module}` } };
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
	const symbols = new Map<string, EntrySymbol[]>();
	for (const [key, file] of entries) {
		const source = program.getSourceFile(file);
		const moduleSymbol = source && checker.getSymbolAtLocation(source);
		if (!moduleSymbol) throw new Error(`Entry ${key} has no module at ${file}`);
		symbols.set(
			key,
			checker.getExportsOfModule(moduleSymbol).map((exported) => {
				const target = exported.flags & ts.SymbolFlags.Alias ? checker.getAliasedSymbol(exported) : exported;
				const declaration = target.declarations?.[0]?.getSourceFile().fileName ?? 'unknown';
				const relative = path.relative(packageDir, declaration);
				const typeOnly =
					exported.declarations?.some((node) => ts.isTypeOnlyImportOrExportDeclaration(node)) ?? false;
				return {
					declaration: `${relative}#${target.name}`,
					isOwn: !relative.startsWith('..') && !relative.split(path.sep).includes('node_modules'),
					exportedAs: exported.name,
					isValue: !typeOnly && (target.flags & ts.SymbolFlags.Value) !== 0,
				};
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
		for (const { declaration } of symbols) {
			owners.set(declaration, [...(owners.get(declaration) ?? []), entry]);
		}
	}
	return [...owners]
		.filter(([, entries]) => entries.length > 1)
		.map(([symbol, entries]) => `${symbol}: ${entries.join(', ')}`);
}

/**
 * The symbols a package's entries export that another package or a library declares, each as
 * `<entry>: <exported name> (<declaration>)`, so a symbol has one import path: its owner's.
 *
 * @remarks
 * A renamed re-export (`export { a as b }`) of such a symbol is listed under the name an importer writes.
 *
 * @param packageDir - The package's directory, with its `package.json` and `tsconfig.json`
 */
export function symbolsFromOtherPackages(packageDir: string): string[] {
	return [...exportsByEntry(packageDir)].flatMap(([entry, symbols]) =>
		symbols
			.filter(({ isOwn }) => !isOwn)
			.map(({ exportedAs, declaration }) => `${entry}: ${exportedAs} (${declaration})`),
	);
}

/** The names a package exports from any of its entries, values and types, sorted and without repeats. */
export function exportedSymbolNames(packageDir: string): string[] {
	const names = [...exportsByEntry(packageDir).values()]
		.flat()
		.map(({ declaration }) => declaration.slice(declaration.indexOf('#') + 1));
	return [...new Set(names)].toSorted();
}

/**
 * The value exports of a package's entries (functions, classes, constants), by the name an importer writes, sorted and
 * without repeats.
 *
 * @remarks
 * The name is the entry's, which differs from {@link exportedSymbolNames} for a re-export under another name
 * (`export { a as b }`). A type-only export is left out.
 */
export function valueExportNames(packageDir: string): string[] {
	const names = [...exportsByEntry(packageDir).values()]
		.flat()
		.filter(({ isValue }) => isValue)
		.map(({ exportedAs }) => exportedAs);
	return [...new Set(names)].toSorted();
}

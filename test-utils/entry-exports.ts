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
 *
 * It throws instead of reporting less than the package exports: for a package with no entry it can read, an exports
 * entry it cannot map, an entry file that is missing, and a re-export whose module or name does not resolve. A missing or
 * stale `dist` of a sibling package is the last case, so the checks run after `build:lib`.
 */
function exportsByEntry(packageDir: string): Map<string, EntrySymbol[]> {
	const cached = exportsByPackage.get(packageDir);
	if (cached) return cached;
	const symbols = readExportsByEntry(packageDir);
	exportsByPackage.set(packageDir, symbols);
	return symbols;
}

type ExportsTarget = string | { readonly [condition: string]: unknown };

const JS_FILE = /\.[cm]?[jt]s$/;
const DIST_JS_FILE = /^\.\/dist\/.+\.js$/;
const DIST_DECLARATION_FILE = /^\.\/dist\/.+\.d\.ts$/;

/**
 * The source file of the entry an `exports` key names, or `undefined` for a target that is neither JavaScript nor a declaration file (`./package.json`, a stylesheet).
 *
 * @remarks
 * A string target and the `import` condition are read as `./dist/<path>.js`. An entry that names only `types` is read
 * as `./dist/<path>.d.ts`, and both map to `src/<path>.ts`. A JavaScript file under any other condition, a file
 * outside `./dist/` or with another extension would be skipped without a word if it were ignored, and a guard that
 * skips an entry guards nothing, so it throws.
 */
function entrySource(packageDir: string, key: string, target: ExportsTarget): string | undefined {
	const conditions = typeof target === 'string' ? { import: target } : target;
	const cannotMap = (reason: string) =>
		new Error(`The helper cannot map the exports entry '${key}' of ${packageDir}: ${reason}.`);
	const files = Object.entries(conditions)
		.filter(([condition]) => condition !== 'types')
		.flatMap(([condition, file]) =>
			typeof file === 'string' && !JS_FILE.test(file) ? [] : [[condition, file] as const],
		);
	if (files.length > 0) {
		const file = conditions.import;
		if (
			typeof file !== 'string' ||
			!DIST_JS_FILE.test(file) ||
			files.some(([condition]) => condition !== 'import')
		) {
			throw cannotMap("it reads `import` as './dist/<path>.js' and no other JavaScript condition");
		}
		return path.join(packageDir, 'src', file.slice('./dist/'.length).replace(/\.js$/, '.ts'));
	}
	const { types } = conditions;
	if (types === undefined) return undefined;
	if (typeof types !== 'string' || !DIST_DECLARATION_FILE.test(types)) {
		throw cannotMap("it reads `types` as './dist/<path>.d.ts'");
	}
	return path.join(packageDir, 'src', types.slice('./dist/'.length).replace(/\.d\.ts$/, '.ts'));
}

/** The re-exports of a source file that name a module, with the specifier they name. */
function reExports(source: ts.SourceFile): ts.ExportDeclaration[] {
	return source.statements.filter(
		(statement): statement is ts.ExportDeclaration =>
			ts.isExportDeclaration(statement) && statement.moduleSpecifier !== undefined,
	);
}

function readExportsByEntry(packageDir: string): Map<string, EntrySymbol[]> {
	const manifest = JSON.parse(readFileSync(path.join(packageDir, 'package.json'), 'utf8')) as {
		exports?: Record<string, ExportsTarget>;
		module?: string;
	};
	const exportMap = manifest.exports ?? { '.': { import: `./${manifest.module}` } };
	const entries = Object.entries(exportMap).flatMap(([key, target]) => {
		const file = entrySource(packageDir, key, target);
		return file === undefined ? [] : [[key, file] as const];
	});
	if (entries.length === 0) throw new Error(`The package at ${packageDir} has no entry to read in its manifest.`);
	const configFile = ts.readConfigFile(path.join(packageDir, 'tsconfig.json'), (file) => ts.sys.readFile(file));
	const { options } = ts.parseJsonConfigFileContent(configFile.config, ts.sys, packageDir);
	const program = ts.createProgram(
		entries.map(([, file]) => file),
		{ ...options, noEmit: true },
	);
	const checker = program.getTypeChecker();
	const unresolved: string[] = [];
	for (const source of program.getSourceFiles()) {
		const relativeFile = path.relative(packageDir, source.fileName);
		if (relativeFile.startsWith('..') || relativeFile.split(path.sep).includes('node_modules')) continue;
		for (const { moduleSpecifier } of reExports(source)) {
			if (
				moduleSpecifier &&
				ts.isStringLiteral(moduleSpecifier) &&
				!checker.getSymbolAtLocation(moduleSpecifier)
			) {
				unresolved.push(`${relativeFile}: the module '${moduleSpecifier.text}' does not resolve`);
			}
		}
	}
	const symbols = new Map<string, EntrySymbol[]>();
	for (const [key, file] of entries) {
		const source = program.getSourceFile(file);
		const moduleSymbol = source && checker.getSymbolAtLocation(source);
		if (!moduleSymbol) throw new Error(`Entry ${key} has no module at ${file}`);
		symbols.set(
			key,
			checker.getExportsOfModule(moduleSymbol).map((exported) => {
				const target = exported.flags & ts.SymbolFlags.Alias ? checker.getAliasedSymbol(exported) : exported;
				const declaration = target.declarations?.[0]?.getSourceFile().fileName;
				if (declaration === undefined) {
					unresolved.push(`${key}: '${exported.name}' does not resolve to a declaration`);
					return { declaration: 'unknown', isOwn: false, exportedAs: exported.name, isValue: false };
				}
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
	if (unresolved.length > 0) {
		throw new Error(
			`The entries of ${packageDir} re-export what does not resolve, so what they export cannot be checked (a package the entries re-export from may need \`build:lib\` first):\n${unresolved.join('\n')}`,
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

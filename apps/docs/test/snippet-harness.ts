import { readdirSync, readFileSync } from 'node:fs';
import { join, sep } from 'node:path';
import { runInNewContext } from 'node:vm';
import * as ts from 'typescript';
import { guideHelpers } from './helper-files';

/** Root of the docs content, one folder per section. */
export const docsRoot = join(import.meta.dirname, '../src/content/docs');

/** A directory that exists only in the virtual file set of {@link typecheck}; snippets resolve relative imports from it. */
export const snippetDir = join(import.meta.dirname, '__snippets__');

/** Page ids (`<section>/<page>`) of every docs page, in path order. */
export function docsPageIds(): string[] {
	return (readdirSync(docsRoot, { recursive: true }) as string[])
		.filter((file) => file.endsWith('.mdx'))
		.map((file) =>
			file
				.split(sep)
				.join('/')
				.replace(/\.mdx$/, ''),
		)
		.toSorted();
}

export function readPage(page: string): string {
	return readFileSync(join(docsRoot, `${page}.mdx`), 'utf8');
}

export interface CodeBlock {
	lang: string;
	code: string;
	heading: string;
	/** What follows the language on the opening fence, such as `title="theme.ts"`. */
	meta: string;
}

/** Fenced code blocks of a page, each with the heading it sits under. */
export function parseCodeBlocks(text: string): CodeBlock[] {
	const blocks: CodeBlock[] = [];
	let heading = '';
	let fence: { lang: string; meta: string; lines: string[] } | undefined;
	for (const line of text.split('\n')) {
		if (fence) {
			if (line.startsWith('```')) {
				blocks.push({ lang: fence.lang, meta: fence.meta, code: fence.lines.join('\n'), heading });
				fence = undefined;
			} else fence.lines.push(line);
			continue;
		}
		const open = line.match(/^```(\w*)\s*(.*)$/);
		if (open) {
			fence = { lang: open[1] ?? '', meta: open[2] ?? '', lines: [] };
			continue;
		}
		const title = line.match(/^#{2,6} (.+)$/);
		if (title) heading = title[1]!.replaceAll('`', '');
	}
	return blocks;
}

export function codeBlocks(page: string): CodeBlock[] {
	return parseCodeBlocks(readPage(page));
}

export const isTypeScriptFence = (block: CodeBlock): boolean => /^(ts|typescript|tsx)$/.test(block.lang);

export function tsBlock(page: string, heading: string, index = 0): string {
	const blocks = codeBlocks(page).filter((block) => block.heading === heading && isTypeScriptFence(block));
	const block = blocks[index];
	if (!block) throw new Error(`No TypeScript block ${index} under "${heading}" on ${page}`);
	return block.code;
}

/** Parsed library and package declaration files, kept across programs: parsing them dominates a type-check. */
const sourceFileCache = new Map<string, ts.SourceFile | undefined>();

/** The root of the docs app, which {@link InstalledModules} resolve against. */
const docsApp = join(import.meta.dirname, '..');

const docsSource = join(docsApp, 'src');

/**
 * Modules a snippet may import that sit in the docs app, as `paths` of the docs' `tsconfig.json`: a specifier and the
 * file it stands for, relative to the docs app.
 *
 * @remarks
 * The files they import resolve `@/generated/*` into `src/generated/*`, the copy of the shadcn registry.
 */
export type InstalledModules = Record<string, string>;

/** The virtual modules of one folder of a program, and the modules of the docs app that its files may import. */
interface VirtualFolder {
	files: Record<string, string>;
	installed: InstalledModules;
	/** The files whose diagnostics are read; all of `files` when absent. */
	report?: string[];
}

/**
 * Type-checks the virtual folders in one program and returns the diagnostics per folder and file.
 *
 * @remarks
 * A program binds and checks the library and package declarations once, however many files import them, so
 * the folders share one. A file resolves its relative imports inside its own folder, and `installed` modules resolve
 * only for the files of the folder that lists them: `paths` is global to a program, so the specifier is resolved per
 * folder by the host instead. A file outside every folder, such as the docs app file that stands for an installed
 * module, resolves `@/generated/*` as the docs app does.
 */
function typecheckFolders(folders: Record<string, VirtualFolder>): Record<string, Record<string, string[]>> {
	const virtual = new Map<string, string>();
	const roots = new Map<string, VirtualFolder>();
	for (const [folder, value] of Object.entries(folders)) {
		for (const [name, text] of Object.entries(value.files)) virtual.set(join(snippetDir, folder, name), text);
		roots.set(join(snippetDir, folder), value);
	}
	const options: ts.CompilerOptions = {
		module: ts.ModuleKind.ESNext,
		moduleResolution: ts.ModuleResolutionKind.Bundler,
		target: ts.ScriptTarget.ES2022,
		jsx: ts.JsxEmit.ReactJSX,
		jsxImportSource: '@ecopages/jsx',
		strict: true,
		skipLibCheck: true,
		noEmit: true,
	};
	const host = ts.createCompilerHost(options);
	const getSourceFile = host.getSourceFile.bind(host);
	const fileExists = host.fileExists.bind(host);
	const readFile = host.readFile.bind(host);
	const directoryExists = host.directoryExists?.bind(host);
	host.directoryExists = (name) =>
		[...roots.keys()].some((root) => root === name || root.startsWith(`${name}${sep}`)) ||
		(directoryExists?.(name) ?? false);
	host.fileExists = (name) => virtual.has(name) || fileExists(name);
	host.readFile = (name) => virtual.get(name) ?? readFile(name);
	host.getSourceFile = (name, languageVersion, onError, shouldCreate) => {
		if (virtual.has(name)) return ts.createSourceFile(name, virtual.get(name)!, languageVersion);
		if (!sourceFileCache.has(name))
			sourceFileCache.set(name, getSourceFile(name, languageVersion, onError, shouldCreate));
		return sourceFileCache.get(name);
	};
	const resolvers = new Map<string, { options: ts.CompilerOptions; cache: ts.ModuleResolutionCache }>();
	const resolverFor = (modules: InstalledModules | undefined) => {
		const key = modules === undefined ? '' : JSON.stringify(modules);
		let resolver = resolvers.get(key);
		if (!resolver) {
			const resolution: ts.CompilerOptions =
				modules === undefined
					? options
					: {
							...options,
							paths: {
								...Object.fromEntries(
									Object.entries(modules).map(([specifier, file]) => [
										specifier,
										[join(docsApp, file)],
									]),
								),
								'@/generated/*': [join(docsApp, 'src/generated/*')],
							},
						};
			resolver = {
				options: resolution,
				cache: ts.createModuleResolutionCache(
					host.getCurrentDirectory(),
					(file) => host.getCanonicalFileName(file),
					resolution,
				),
			};
			resolvers.set(key, resolver);
		}
		return resolver;
	};
	const modulesOf = (containingFile: string): InstalledModules | undefined => {
		const folder = [...roots].find(([root]) => containingFile.startsWith(`${root}${sep}`))?.[1];
		if (folder) return Object.keys(folder.installed).length > 0 ? folder.installed : undefined;
		return containingFile.startsWith(`${docsSource}${sep}`) ? {} : undefined;
	};
	host.resolveModuleNameLiterals = (
		literals,
		containingFile,
		redirectedReference,
		_options,
		containingSourceFile,
	) => {
		const { options: resolution, cache } = resolverFor(modulesOf(containingFile));
		return literals.map((literal) =>
			ts.resolveModuleName(
				literal.text,
				containingFile,
				resolution,
				host,
				cache,
				redirectedReference,
				ts.getModeForUsageLocation(containingSourceFile, literal, resolution),
			),
		);
	};
	const program = ts.createProgram([...virtual.keys()], options, host);
	return Object.fromEntries(
		Object.entries(folders).map(([folder, { files, report }]) => [
			folder,
			Object.fromEntries(
				(report ?? Object.keys(files)).map((name) => {
					const source = program.getSourceFile(join(snippetDir, folder, name));
					return [
						name,
						ts
							.getPreEmitDiagnostics(program, source)
							.map((diagnostic) => ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n')),
					];
				}),
			),
		]),
	);
}

/** Type-checks virtual modules next to each other and returns the diagnostics per file. */
export function typecheck(files: Record<string, string>, installed: InstalledModules = {}): Record<string, string[]> {
	return typecheckFolders({ '': { files, installed } })[''] ?? {};
}

const REACT_PRAGMA = '/** @jsxImportSource react */';

/** A `tsx` fence with no title that imports from React or the React renderer is React JSX. */
const REACT_IMPORT = /from '(react|@schema-engine\/forms-react[^']*)'/;

/** A `.react.tsx` file is React JSX whatever it imports, and any other titled file is not. */
const isReactFence = (title: string | undefined, code: string): boolean =>
	title === undefined ? REACT_IMPORT.test(code) : title.endsWith('.react.tsx');

/** A TypeScript fence that does not compile, named by its page, its place on the page and its heading. */
export interface SnippetFailure {
	page: string;
	/** One-based ordinal among the TypeScript fences of the page. */
	fence: number;
	heading: string;
	messages: string[];
}

/** A docs page for {@link checkSiteSnippets}: its text and the files and installed modules its fences may import. */
export interface SitePage {
	page: string;
	text: string;
	app: Record<string, string>;
	installed?: InstalledModules;
}

interface CheckedFence {
	page: string;
	fence: number;
	block: CodeBlock;
	messages: string[];
}

/** The virtual files of a page: its app, then each fence named by its title or its ordinal. */
function pageFiles({ text, app }: SitePage): {
	files: Record<string, string>;
	fences: { block: CodeBlock; fence: number; name: string }[];
} {
	const files: Record<string, string> = { ...app };
	const fences = parseCodeBlocks(text)
		.filter(isTypeScriptFence)
		.map((block, index) => {
			const fence = index + 1;
			const titled = block.meta.match(/title="([^"]+)"/)?.[1];
			const name = titled ?? `fence-${fence}.${block.lang === 'tsx' ? 'tsx' : 'ts'}`;
			const code = /^\s*(import|export)\s/m.test(block.code) ? block.code : `${block.code}\nexport {};`;
			files[name] = block.lang === 'tsx' && isReactFence(titled, block.code) ? `${REACT_PRAGMA}\n${code}` : code;
			return { block, fence, name };
		});
	return { files, fences };
}

/**
 * Whether a file adds to the global scope of the program that holds it.
 *
 * @remarks
 * A script file (no import or export) declares globals, a `declare global` block extends them, and a
 * `declare module '<name>'` in a module file augments a module that every other file sees too.
 */
function addsToGlobalScope(name: string, text: string): boolean {
	const source = ts.createSourceFile(name, text, ts.ScriptTarget.ES2022, false);
	return (
		!ts.isExternalModule(source) ||
		source.statements.some(
			(statement) =>
				ts.isModuleDeclaration(statement) &&
				(ts.isStringLiteral(statement.name) || (statement.flags & ts.NodeFlags.GlobalAugmentation) !== 0),
		)
	);
}

const isolated = (files: Record<string, string>): boolean =>
	Object.entries(files).some(([name, text]) => addsToGlobalScope(name, text));

/** Type-checks the fences of the pages and returns every fence with its diagnostics. */
function checkFences(pages: SitePage[]): CheckedFence[] {
	const built = pages.map((page) => ({ page, ...pageFiles(page) })).filter(({ fences }) => fences.length > 0);
	const folderOf = ({ page, files, fences }: (typeof built)[number]): [string, VirtualFolder] => [
		page.page,
		{ files, installed: page.installed ?? {}, report: fences.map(({ name }) => name) },
	];
	const diagnostics = {
		...typecheckFolders(Object.fromEntries(built.filter(({ files }) => !isolated(files)).map(folderOf))),
		...Object.assign(
			{},
			...built
				.filter(({ files }) => isolated(files))
				.map((entry) => typecheckFolders(Object.fromEntries([folderOf(entry)]))),
		),
	};
	return built.flatMap(({ page, fences }) =>
		fences.map(({ block, fence, name }) => ({
			page: page.page,
			fence,
			block,
			messages: diagnostics[page.page]?.[name] ?? [],
		})),
	);
}

const failuresOf = (checked: CheckedFence[]): SnippetFailure[] =>
	checked
		.filter(({ messages }) => messages.length > 0)
		.map(({ page, fence, block, messages }) => ({ page, fence, heading: block.heading, messages }));

/**
 * Type-checks the `ts` and `tsx` fences of a page, each as its own module of one virtual app.
 *
 * @remarks
 * `app` holds the files the page tells the reader to have: a snippet imports them as `./<name>`. A fence whose
 * meta carries `title="<name>"` is itself a file of the app, so a later fence on the page can import it. A fence
 * with no import or export gets an empty export, so snippets that declare the same name do not collide. A fence
 * for which `skip` returns true is left out. A fence that holds JSX needs the `tsx` tag: under `ts` it fails to
 * parse. A `tsx` fence titled `*.react.tsx` is compiled as React JSX, as is an untitled one that imports React or
 * `@schema-engine/forms-react`. `installed` lets the page import modules of the docs app that stand for the files an
 * install leaves in the reader's app.
 */
export function checkPageSnippets(
	page: string,
	text: string,
	app: Record<string, string>,
	skip: (block: CodeBlock, fence: number) => boolean = () => false,
	installed: InstalledModules = {},
): SnippetFailure[] {
	return failuresOf(checkFences([{ page, text, app, installed }]).filter(({ block, fence }) => !skip(block, fence)));
}

/**
 * Type-checks the fences of every page in one program and returns the fences that do not compile.
 *
 * @remarks
 * Each page is a folder of its own in the program, so file names that pages share, such as `fence-1.ts` and
 * `app.ts`, do not collide, and a failure names its own page. The library, React and package declarations are
 * checked once for the whole site instead of once per page. Fences are checked as in {@link checkPageSnippets},
 * with none skipped: a caller that allows a fence filters the failures it gets back. A page with a file that adds
 * to the global scope (a `declare global` block, a `declare module '<name>'` augmentation, or a file with no import
 * or export) is checked in a program of its own, found with the TypeScript syntax tree: in the shared program its
 * declarations would reach the other pages and could hide their errors.
 */
export function checkSiteSnippets(pages: SitePage[]): SnippetFailure[] {
	return failuresOf(checkFences(pages));
}

/** Runs a snippet as a CommonJS module with the given modules and returns its exports. */
export function run(code: string, modules: Record<string, unknown>): Record<string, unknown> {
	const output = ts.transpileModule(code, {
		compilerOptions: {
			target: ts.ScriptTarget.ES2022,
			module: ts.ModuleKind.CommonJS,
			jsx: ts.JsxEmit.ReactJSX,
			jsxImportSource: code.includes('@jsxImportSource react') ? 'react' : '@ecopages/jsx',
		},
	}).outputText;
	const exports: Record<string, unknown> = {};
	runInNewContext(output, {
		exports,
		require: (name: string) => {
			if (!(name in modules)) throw new Error(`Unexpected import ${name}`);
			return modules[name];
		},
	});
	return exports;
}

/** The fences of a page whose meta names a file (`title="<name>"`), in page order. */
export function titledFiles(page: string): Record<string, string> {
	return Object.fromEntries(
		codeBlocks(page).flatMap((block) => {
			const name = block.meta.match(/title="([^"]+)"/)?.[1];
			return name ? [[name, block.code] as const] : [];
		}),
	);
}

/** What {@link titledRunner} gives back: the files' modules, loaded on demand, and what they logged. */
export interface TitledRunner {
	/** Runs the titled file `name` once and returns its exports. */
	load(name: string): Record<string, unknown>;
	/** Every line the files logged, in order. */
	lines: string[];
}

/**
 * Loads the titled files of one or more pages as modules.
 *
 * @remarks
 * A relative import (`./components`) loads the titled file of that name from the pages, the last page winning;
 * any other import comes from `modules`. `globals` are visible to the files, for example `Response` and
 * `fetch`. A page may also import a helper it does not show (`./i18n.helper`): `helpers` maps the file names to
 * their text, the guide-source helpers by default, and a titled file of the same name wins. A `tsx` file is
 * compiled as React JSX when its name ends in `.react.tsx` and as Ecopages JSX otherwise, so `modules` holds the
 * matching `jsx-runtime`.
 */
export function titledRunner(
	pages: string | string[],
	modules: Record<string, unknown>,
	globals: Record<string, unknown> = {},
	helpers: Record<string, string> = guideHelpers(),
): TitledRunner {
	const names = [pages].flat();
	const files = Object.assign({}, helpers, ...names.map(titledFiles)) as Record<string, string>;
	const lines: string[] = [];
	const loaded = new Map<string, Record<string, unknown>>();
	const load = (name: string): Record<string, unknown> => {
		const cached = loaded.get(name);
		if (cached) return cached;
		const source = files[name];
		if (source === undefined) throw new Error(`${names.join(', ')} has no file titled ${name}`);
		const output = ts.transpileModule(source, {
			compilerOptions: {
				target: ts.ScriptTarget.ES2022,
				module: ts.ModuleKind.CommonJS,
				jsx: ts.JsxEmit.ReactJSX,
				jsxImportSource: name.endsWith('.react.tsx') ? 'react' : '@ecopages/jsx',
			},
		}).outputText;
		const exports: Record<string, unknown> = {};
		loaded.set(name, exports);
		runInNewContext(output, {
			...globals,
			exports,
			console: { log: (...args: unknown[]) => lines.push(args.join(' ')) },
			require: (request: string) => {
				if (request.startsWith('./')) {
					const file = request.slice(2);
					return load([`${file}.ts`, `${file}.tsx`].find((candidate) => candidate in files) ?? `${file}.ts`);
				}
				if (!(request in modules)) throw new Error(`Unexpected import ${request}`);
				return modules[request];
			},
		});
		return exports;
	};
	return { load, lines };
}

/**
 * Runs the titled files of one or more pages, starting at `entry`, and returns every line they logged.
 *
 * @remarks
 * The entry may start asynchronous work, so the call waits one turn of the event loop before it returns, which
 * is enough for work that waits on promises. Work that waits on a timer needs `settleMs`, the time to wait. `globals` are visible to the files.
 */
export async function runTitledFiles(
	pages: string | string[],
	modules: Record<string, unknown>,
	entry: string,
	{ settleMs = 0, globals = {} }: { settleMs?: number; globals?: Record<string, unknown> } = {},
): Promise<string[]> {
	const runner = titledRunner(pages, modules, globals);
	runner.load(entry);
	await new Promise((resolve) => setTimeout(resolve, settleMs));
	return runner.lines;
}

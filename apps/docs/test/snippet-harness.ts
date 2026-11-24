import { readdirSync, readFileSync } from 'node:fs';
import { join, sep } from 'node:path';
import { runInNewContext } from 'node:vm';
import * as ts from 'typescript';

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

/** Type-checks virtual modules next to each other and returns the diagnostics per file. */
export function typecheck(files: Record<string, string>): Record<string, string[]> {
	const virtual = new Map(Object.entries(files).map(([name, text]) => [join(snippetDir, name), text]));
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
	host.directoryExists = (name) => name === snippetDir || (directoryExists?.(name) ?? false);
	host.fileExists = (name) => virtual.has(name) || fileExists(name);
	host.readFile = (name) => virtual.get(name) ?? readFile(name);
	host.getSourceFile = (name, languageVersion, onError, shouldCreate) => {
		if (virtual.has(name)) return ts.createSourceFile(name, virtual.get(name)!, languageVersion);
		if (!sourceFileCache.has(name))
			sourceFileCache.set(name, getSourceFile(name, languageVersion, onError, shouldCreate));
		return sourceFileCache.get(name);
	};
	const program = ts.createProgram([...virtual.keys()], options, host);
	const result: Record<string, string[]> = {};
	for (const name of Object.keys(files)) {
		const source = program.getSourceFile(join(snippetDir, name));
		result[name] = ts
			.getPreEmitDiagnostics(program, source)
			.map((diagnostic) => ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n'));
	}
	return result;
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

/**
 * Type-checks the `ts` and `tsx` fences of a page, each as its own module of one virtual app.
 *
 * @remarks
 * `app` holds the files the page tells the reader to have: a snippet imports them as `./<name>`. A fence whose
 * meta carries `title="<name>"` is itself a file of the app, so a later fence on the page can import it. A fence
 * with no import or export gets an empty export, so snippets that declare the same name do not collide. A fence
 * for which `skip` returns true is left out. A fence that holds JSX needs the `tsx` tag: under `ts` it fails to
 * parse. A `tsx` fence titled `*.react.tsx` is compiled as React JSX, as is an untitled one that imports React or
 * `@schema-engine/forms-react`.
 */
export function checkPageSnippets(
	page: string,
	text: string,
	app: Record<string, string>,
	skip: (block: CodeBlock, fence: number) => boolean = () => false,
): SnippetFailure[] {
	const fences = parseCodeBlocks(text)
		.filter(isTypeScriptFence)
		.map((block, index) => ({ block, fence: index + 1 }));
	const files: Record<string, string> = { ...app };
	const names = new Map<number, string>();
	for (const { block, fence } of fences) {
		const titled = block.meta.match(/title="([^"]+)"/)?.[1];
		const name = titled ?? `fence-${fence}.${block.lang === 'tsx' ? 'tsx' : 'ts'}`;
		names.set(fence, name);
		const code = /^\s*(import|export)\s/m.test(block.code) ? block.code : `${block.code}\nexport {};`;
		files[name] = block.lang === 'tsx' && isReactFence(titled, block.code) ? `${REACT_PRAGMA}\n${code}` : code;
	}
	const checked = fences.filter(({ block, fence }) => !skip(block, fence));
	if (checked.length === 0) return [];
	const diagnostics = typecheck(files);
	return checked.flatMap(({ block, fence }) => {
		const messages = diagnostics[names.get(fence)!] ?? [];
		return messages.length > 0 ? [{ page, fence, heading: block.heading, messages }] : [];
	});
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
 * `fetch`.
 */
export function titledRunner(
	pages: string | string[],
	modules: Record<string, unknown>,
	globals: Record<string, unknown> = {},
): TitledRunner {
	const names = [pages].flat();
	const files = Object.assign({}, ...names.map(titledFiles)) as Record<string, string>;
	const lines: string[] = [];
	const loaded = new Map<string, Record<string, unknown>>();
	const load = (name: string): Record<string, unknown> => {
		const cached = loaded.get(name);
		if (cached) return cached;
		const source = files[name];
		if (source === undefined) throw new Error(`${names.join(', ')} has no file titled ${name}`);
		const output = ts.transpileModule(source, {
			compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
		}).outputText;
		const exports: Record<string, unknown> = {};
		loaded.set(name, exports);
		runInNewContext(output, {
			...globals,
			exports,
			console: { log: (...args: unknown[]) => lines.push(args.join(' ')) },
			require: (request: string) => {
				if (request.startsWith('./')) return load(`${request.slice(2)}.ts`);
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

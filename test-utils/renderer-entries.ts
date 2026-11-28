import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { build, type Metafile } from 'esbuild';

/** The entries every renderer package exports, with the same meaning in each (see CONTEXT.md, Renderer entries). */
export const SHARED_RENDERER_ENTRIES = ['.', './package.json', './primitives', './debugger', './debugger.css'] as const;

/** What an element, container or recipe author imports from `/primitives` of every renderer, and no renderer root exports. */
export const RENDERER_AUTHOR_CONTRACT = [
	'FormElement',
	'FormElements',
	'FormElementsProps',
	'ChildGrid',
	'ChildGridProps',
	'defineRecipe',
	'FormShellProps',
	'FormShellComponent',
] as const;

interface Manifest {
	name: string;
	exports: Record<string, unknown>;
}

function readManifest(packageDir: string): Manifest {
	return JSON.parse(readFileSync(path.join(packageDir, 'package.json'), 'utf8')) as Manifest;
}

/** The `exports` keys of a package's manifest, in declaration order. */
export function exportsKeys(packageDir: string): string[] {
	return Object.keys(readManifest(packageDir).exports);
}

/** The `exports` keys of the entries that are JavaScript modules, which leaves out `./package.json` and the stylesheets. */
export function scriptEntryKeys(packageDir: string): string[] {
	return Object.entries(readManifest(packageDir).exports)
		.filter(([key, target]) => key !== './package.json' && typeof target === 'object')
		.map(([key]) => key);
}

/** The specifier a consumer writes for an `exports` key of a package. */
export function specifierOf(packageDir: string, key: string): string {
	const { name } = readManifest(packageDir);
	return key === '.' ? name : `${name}${key.slice(1)}`;
}

/**
 * What a consumer's `import()` of one specifier gives, from a fresh Node process.
 *
 * `error` is the error's `code` (`ERR_PACKAGE_PATH_NOT_EXPORTED` for an entry the exports map does not name), else its message.
 */
export interface ConsumerImportResult {
	readonly exports?: string[];
	readonly error?: string;
}

const CONSUMER_IMPORT_SCRIPT = `
const { bootstrap, specifier } = JSON.parse(process.env.CONSUMER_IMPORT);
try {
	if (bootstrap) await import(bootstrap);
	const entry = await import(specifier);
	console.log(JSON.stringify({ exports: Object.keys(entry).toSorted() }));
} catch (error) {
	console.log(JSON.stringify({ error: error?.code ?? String(error?.message ?? error) }));
}
`;

const CONSUMER_RESOLVE_SCRIPT = `
const { specifier } = JSON.parse(process.env.CONSUMER_IMPORT);
try {
	console.log(JSON.stringify({ exports: [import.meta.resolve(specifier)] }));
} catch (error) {
	console.log(JSON.stringify({ error: error?.code ?? String(error?.message ?? error) }));
}
`;

function runConsumer(packageDir: string, script: string, input: { specifier: string; bootstrap?: string }) {
	const run = spawnSync(process.execPath, ['--input-type=module', '--eval', script], {
		cwd: packageDir,
		env: { ...process.env, CONSUMER_IMPORT: JSON.stringify(input) },
		encoding: 'utf8',
	});
	if (run.status !== 0) {
		throw new Error(`The consumer process for '${input.specifier}' exited with ${run.status}:\n${run.stderr}`);
	}
	return JSON.parse(run.stdout.trim().split('\n').at(-1) ?? '') as ConsumerImportResult;
}

/**
 * Imports a specifier the way a consumer does, in a fresh `node` process with `packageDir` as the working directory.
 *
 * @param packageDir - A package folder, whose own name Node resolves through the package's `exports`, so the import loads `dist`
 * @param specifier - What the consumer writes, such as `@schema-engine/forms-react/primitives`
 * @param options.bootstrap - A module to import first, such as a renderer's server runtime
 *
 * @remarks
 * No tsconfig `paths` and no vitest alias take part, so a subpath the exports map dropped fails here although a source alias
 * would still find it. It needs the built `dist`.
 */
export function consumerImport(
	packageDir: string,
	specifier: string,
	options: { readonly bootstrap?: string } = {},
): ConsumerImportResult {
	return runConsumer(packageDir, CONSUMER_IMPORT_SCRIPT, { specifier, bootstrap: options.bootstrap });
}

/** Resolves a specifier the way a consumer does, in a fresh process; `exports` holds the one `file:` URL it resolves to. */
export function consumerResolve(packageDir: string, specifier: string): ConsumerImportResult {
	return runConsumer(packageDir, CONSUMER_RESOLVE_SCRIPT, { specifier });
}

/** The output of a bundle of a published entry. */
export interface PublishedBundle {
	/** The bundled code, with one copy of every module of the package that the entry reaches. */
	readonly code: string;
	/** The path of every input file with bytes in an output file, relative to the package folder. */
	readonly inputs: string[];
}

/**
 * Bundles an entry source the way an app's bundler reads the published package.
 *
 * @param packageDir - The package folder; the entry is written there in memory so the package's own name resolves through its `exports` to `dist`
 * @param source - The entry module, for example `import { defineRecipe } from '@schema-engine/forms-radiant/primitives'`
 *
 * @remarks
 * The package's dependencies and peer dependencies stay external, so the bundle holds the package's own modules and the
 * names of the custom elements it defines. Stylesheets load as empty. An input counts when any output file holds bytes of it.
 * An empty `tsconfigRaw` keeps esbuild from reading the package's `tsconfig.json`, whose `paths` map the package's own name to
 * `src` and would bundle the source instead of what is published.
 *
 * With `bundleDependencies`, the entry is bundled as an app does: the dependencies are bundled too and the output is split,
 * so a module a dynamic `import()` reaches is an output file of its own. Only the output files the entry loads count, through
 * static or dynamic imports: esbuild also writes a file for the `import()` of any module it scanned, even one whose code
 * tree-shaking removed, and nothing loads that file.
 */
export async function bundlePublishedEntry(
	packageDir: string,
	source: string,
	options: { readonly bundleDependencies?: boolean } = {},
): Promise<PublishedBundle> {
	const manifest = JSON.parse(readFileSync(path.join(packageDir, 'package.json'), 'utf8')) as {
		name: string;
		dependencies?: Record<string, string>;
		peerDependencies?: Record<string, string>;
	};
	const dependencies = Object.keys({ ...manifest.dependencies, ...manifest.peerDependencies }).filter(
		(name) => name !== manifest.name,
	);
	const result = await build({
		stdin: { contents: source, resolveDir: packageDir, sourcefile: 'consumer-entry.ts', loader: 'ts' },
		absWorkingDir: packageDir,
		tsconfigRaw: {},
		bundle: true,
		write: false,
		format: 'esm',
		platform: options.bundleDependencies ? 'browser' : 'neutral',
		conditions: ['import'],
		external: options.bundleDependencies ? [] : dependencies.flatMap((name) => [name, `${name}/*`]),
		splitting: options.bundleDependencies === true,
		outdir: options.bundleDependencies ? path.join(packageDir, '.bundle-probe') : undefined,
		loader: { '.css': 'empty' },
		metafile: true,
		logLevel: 'silent',
	});
	return {
		code: result.outputFiles.map((file) => file.text).join('\n'),
		inputs: inputsInOutput(result.metafile, options.bundleDependencies === true),
	};
}

/**
 * The inputs with bytes in any output file, not `metafile.inputs`, which also lists the modules the bundler scanned and then
 * tree-shook away, so it would fail a correct bundle.
 */
function inputsInOutput(metafile: Metafile, onlyLoadedByEntry = false): string[] {
	const outputs = onlyLoadedByEntry ? outputsLoadedByEntry(metafile) : Object.values(metafile.outputs);
	const files = new Set<string>();
	for (const output of outputs) {
		for (const [file, { bytesInOutput }] of Object.entries(output.inputs)) {
			if (bytesInOutput > 0 && !file.startsWith('<stdin>')) files.add(file);
		}
	}
	return [...files];
}

/** The output files the entry source loads, followed through static and dynamic imports. */
function outputsLoadedByEntry(metafile: Metafile): Metafile['outputs'][string][] {
	const pending = Object.keys(metafile.outputs).filter(
		(file) => metafile.outputs[file]?.entryPoint === 'consumer-entry.ts',
	);
	const loaded = new Set<string>();
	for (let file = pending.pop(); file !== undefined; file = pending.pop()) {
		if (loaded.has(file)) continue;
		loaded.add(file);
		for (const { path: imported, external } of metafile.outputs[file]?.imports ?? []) {
			if (!external && metafile.outputs[imported]) pending.push(imported);
		}
	}
	return [...loaded].map((file) => metafile.outputs[file]!);
}

/**
 * Bundles a stylesheet source the way an app's bundler reads the published package; `code` is the resulting CSS.
 *
 * @param source - The stylesheet, for example `@import '@schema-engine/forms-radiant/index.css';`
 */
export async function bundlePublishedStyles(packageDir: string, source: string): Promise<PublishedBundle> {
	const result = await build({
		stdin: { contents: source, resolveDir: packageDir, sourcefile: 'consumer-entry.css', loader: 'css' },
		absWorkingDir: packageDir,
		tsconfigRaw: {},
		bundle: true,
		write: false,
		metafile: true,
		logLevel: 'silent',
	});
	return { code: result.outputFiles.map((file) => file.text).join('\n'), inputs: inputsInOutput(result.metafile) };
}

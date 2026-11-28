import { copyFileSync, existsSync, globSync } from 'node:fs';
import path from 'node:path';
import { build, context, type BuildOptions, type Plugin } from 'esbuild';

interface BuildLibOptions {
	cwd?: string;
	entryGlobs: string[];
	exclude?: string[];
	outdir?: string;
	outbase?: string;
	splitting?: boolean;
	/**
	 * Writes one output file per source module and keeps every import between them as a relative `.js` import.
	 *
	 * @remarks
	 * Every eligible module under `outbase` becomes an entry point, whether or not an entry glob reaches it, because an
	 * import that stays external is no longer followed to its target. A package that lists its load-time side effects
	 * in `sideEffects` needs this: hashed shared chunks cannot be listed, and a bundler that drops an unlisted chunk
	 * drops the elements it registers. It turns `splitting` off by default, since nothing is left to share, so each file
	 * carries the few compiler helpers it uses.
	 */
	preserveModules?: boolean;
	minify?: boolean;
	external?: string[];
	plugins?: Plugin[];
	onEnd?: () => void | Promise<void>;
}

/**
 * Keeps each import that resolves to a script inside `outbase` as an external relative `.js` import of the module's own output file.
 *
 * @remarks
 * Stylesheet imports are left to the plugins that stub them or the CSS bundler. A target outside `outbase` is bundled.
 */
function preserveModulesPlugin(outbase: string): Plugin {
	return {
		name: 'preserve-modules',
		setup(buildApi) {
			buildApi.onResolve({ filter: /.*/ }, async (args) => {
				const isScriptImport = args.kind === 'import-statement' || args.kind === 'dynamic-import';
				if (!isScriptImport || args.pluginData?.preserveModules || args.path.endsWith('.css')) {
					return null;
				}
				const resolved = await buildApi.resolve(args.path, {
					importer: args.importer,
					kind: args.kind,
					namespace: args.namespace,
					resolveDir: args.resolveDir,
					pluginData: { preserveModules: true },
				});
				const target = resolved.path;
				const isInsideOutbase =
					!resolved.external && path.isAbsolute(target) && !path.relative(outbase, target).startsWith('..');
				if (resolved.errors.length > 0 || !isInsideOutbase || !/\.[cm]?[jt]sx?$/.test(target)) {
					return null;
				}
				const relative = path
					.relative(path.dirname(args.importer), target)
					.replace(/\.[cm]?[jt]sx?$/, '.js')
					.split(path.sep)
					.join('/');
				return { path: relative.startsWith('.') ? relative : `./${relative}`, external: true };
			});
		},
	};
}

function collectEntryPoints(cwd: string, patterns: string[], exclude: string[]): string[] {
	const files = new Set<string>();
	for (const pattern of patterns) {
		for (const file of globSync(pattern, { cwd })) {
			if (exclude.some((fragment) => file.includes(fragment))) {
				continue;
			}
			files.add(path.join(cwd, file));
		}
	}
	return [...files];
}

/**
 * Puts the skill router of `@schema-engine/registry` into the `skill` folder of a package that ships a skill.
 *
 * @remarks
 * The router is one file, `packages/registry/skill/SKILL.md`. Every published package carries a copy, so an agent that installed
 * only that package finds it, whatever the package manager links at the top level. The copy is derived on every build and is
 * not tracked.
 */
function copySkillRouter(cwd: string): void {
	const router = path.resolve(cwd, '../registry/skill/SKILL.md');
	const skillRoot = path.join(cwd, 'skill');
	if (path.resolve(skillRoot, 'SKILL.md') === router || !existsSync(skillRoot) || !existsSync(router)) return;
	copyFileSync(router, path.join(skillRoot, 'SKILL.md'));
}

export async function buildLib(options: BuildLibOptions): Promise<void> {
	const cwd = options.cwd ?? process.cwd();
	copySkillRouter(cwd);
	const watch = process.argv.includes('--watch');
	const outdir = path.resolve(cwd, options.outdir ?? 'dist');
	const outbase = path.resolve(cwd, options.outbase ?? 'src');
	const exclude = options.exclude ?? ['.test.', '.stories.', '.play.'];
	const sourceModules = options.preserveModules
		? [`${path.relative(cwd, outbase)}/**/*.ts`, `${path.relative(cwd, outbase)}/**/*.tsx`]
		: [];
	const entryPoints = collectEntryPoints(cwd, [...options.entryGlobs, ...sourceModules], exclude);

	if (entryPoints.length === 0) {
		throw new Error(`No entry points matched ${options.entryGlobs.join(', ')}`);
	}

	const plugins = [...(options.plugins ?? [])];
	if (options.preserveModules) {
		plugins.push(preserveModulesPlugin(outbase));
	}

	const onEnd = options.onEnd;
	if (onEnd) {
		plugins.push({
			name: 'on-end',
			setup(buildApi) {
				buildApi.onEnd(async (result) => {
					if (result.errors.length === 0) {
						await onEnd();
					}
				});
			},
		});
	}

	const esbuildOptions: BuildOptions = {
		absWorkingDir: cwd,
		entryPoints,
		outdir,
		outbase,
		bundle: true,
		format: 'esm',
		platform: 'browser',
		target: 'es2022',
		splitting: options.splitting ?? !options.preserveModules,
		minify: watch ? false : (options.minify ?? false),
		sourcemap: 'external',
		packages: 'external',
		external: options.external ?? [],
		define: {
			'import.meta.env.ECOPAGES_LOGGER_DEBUG': '"false"',
			'process.env.NODE_ENV': watch ? '"development"' : '"production"',
		},
		logLevel: 'info',
		plugins,
	};

	if (watch) {
		const ctx = await context(esbuildOptions);
		await ctx.watch();
		console.log('Watching for changes...');
		return;
	}

	await build(esbuildOptions);
}

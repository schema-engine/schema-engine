import { copyFileSync, existsSync, globSync, lstatSync } from 'node:fs';
import path from 'node:path';
import { build, context, type BuildOptions, type Plugin } from 'esbuild';

const EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx', '.css', '.json'];
type Alias = { prefix: string; dir: string };

interface BuildLibOptions {
	cwd?: string;
	entryGlobs: string[];
	exclude?: string[];
	outdir?: string;
	outbase?: string;
	splitting?: boolean;
	minify?: boolean;
	external?: string[];
	aliases?: Alias[];
	plugins?: Plugin[];
	onEnd?: () => void | Promise<void>;
}

function resolveAliasTarget(absoluteBase: string): string | null {
	if (existsSync(absoluteBase) && lstatSync(absoluteBase).isFile()) {
		return absoluteBase;
	}

	for (const ext of EXTENSIONS) {
		const withExt = `${absoluteBase}${ext}`;
		if (existsSync(withExt) && lstatSync(withExt).isFile()) {
			return withExt;
		}
	}

	for (const ext of EXTENSIONS) {
		const indexFile = path.join(absoluteBase, `index${ext}`);
		if (existsSync(indexFile) && lstatSync(indexFile).isFile()) {
			return indexFile;
		}
	}

	return null;
}

function aliasPlugin(aliases: Alias[]): Plugin {
	const ordered = [...aliases].sort((a, b) => b.prefix.length - a.prefix.length);

	return {
		name: 'workspace-alias',
		setup(buildApi) {
			buildApi.onResolve({ filter: /^@/ }, (args) => {
				for (const { prefix, dir } of ordered) {
					if (args.path !== prefix && !args.path.startsWith(`${prefix}/`)) {
						continue;
					}

					const rest = args.path === prefix ? '' : args.path.slice(prefix.length + 1);
					const resolved = resolveAliasTarget(rest ? path.join(dir, rest) : dir);
					if (resolved) {
						return { path: resolved };
					}
				}

				return null;
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
	const entryPoints = collectEntryPoints(cwd, options.entryGlobs, exclude);

	if (entryPoints.length === 0) {
		throw new Error(`No entry points matched ${options.entryGlobs.join(', ')}`);
	}

	const plugins = [...(options.aliases?.length ? [aliasPlugin(options.aliases)] : []), ...(options.plugins ?? [])];

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
		splitting: options.splitting ?? true,
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

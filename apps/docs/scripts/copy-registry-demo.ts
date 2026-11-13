import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, join, posix } from 'node:path';
import { pathToFileURL } from 'node:url';

const repoRoot = join(import.meta.dirname, '../../..');
const appRoot = join(import.meta.dirname, '..');

/** Where the copy lands, as the docs' `@/` alias sees it. */
export const REGISTRY_DEMO_ALIAS = '@/generated/shadcn';
export const REGISTRY_DEMO_ROOT = join(appRoot, 'src/generated/shadcn');

const REGISTRY_ITEMS = [
	'schema-engine-form-input',
	'schema-engine-form-field-primitive',
	'schema-engine-form-utils',
	'schema-engine-form-recipes',
] as const;

/** The card recipe out of the `schema-engine-form-recipes` item, which also carries every other shell. */
const RECIPE_FILES = new Set([
	'registry/shared/forms/recipes/recipes.css',
	'registry/shared/forms/recipes/registrations/card.ts',
	'registry/shared/forms/recipes/shells/card-shell.tsx',
	'registry/shared/forms/recipes/shells/card-shell.css',
	'registry/shared/forms/recipes/blocks/step-header.tsx',
	'registry/shared/forms/recipes/blocks/form-actions.tsx',
]);

/** The shadcn components the catalog items list as `registryDependencies`, taken from the repository's own copy of them. */
const SHADCN_FILES: ReadonlyArray<readonly [source: string, target: string]> = [
	['packages/forms-react/.storybook/ui/input.tsx', 'components/ui/input.tsx'],
	['packages/forms-react/.storybook/ui/label.tsx', 'components/ui/label.tsx'],
	['packages/forms-react/.storybook/ui/button.tsx', 'components/ui/button.tsx'],
	['registry/ui-stubs/lib/utils.ts', 'lib/utils.ts'],
];

type RegistryFile = { path: string; target?: string };
type RegistryItem = { name: string; files: RegistryFile[] };

/** Resolves a catalog `target` the way a consumer's `components.json` aliases do (`@components`, `@ui`). */
function resolveTarget(target: string): string {
	if (target.startsWith('@components/')) return `components/${target.slice('@components/'.length)}`;
	if (target.startsWith('@ui/')) return `components/ui/${target.slice('@ui/'.length)}`;
	throw new Error(`[docs] Unknown registry target alias: ${target}`);
}

/**
 * Copies the registry source the shadcn example renders into the docs app.
 *
 * @remarks
 * It applies what `shadcn add` applies to a registry item: the file list and target paths come from
 * `registry.json`, resolved through the `@components` and `@ui` aliases, and the consumer's `@/`
 * imports are pointed at the copy. It does not run the CLI. The files land under `src/generated/shadcn`
 * because the Ecopages dev client transform refuses entrypoints outside `src/`, so the demo graph
 * cannot import `registry/` directly.
 *
 * Deviations from a real install:
 * - the shadcn `input`, `label` and `button` come from `packages/forms-react/.storybook/ui`, and
 *   `lib/utils.ts` from `registry/ui-stubs`, not from the shadcn registry;
 * - only the `input` field and the `card` recipe are copied, not the whole `schema-engine-form-recipes` item;
 * - components are written as `.react.tsx`, the extension the docs' React integration owns (the docs
 *   default to the Ecopages JSX runtime), imports of them gain the `.react` suffix and the files get the
 *   React JSX pragma;
 * - the recipe and control CSS are imported from a component, unlayered, where an app would import
 *   them once in its global stylesheet.
 */
export async function copyRegistryDemo(root = REGISTRY_DEMO_ROOT, alias = REGISTRY_DEMO_ALIAS): Promise<string[]> {
	const catalog = JSON.parse(await readFile(join(repoRoot, 'registry.json'), 'utf8')) as { items: RegistryItem[] };
	const copies: Array<readonly [source: string, target: string]> = [...SHADCN_FILES];
	for (const name of REGISTRY_ITEMS) {
		const item = catalog.items.find((candidate) => candidate.name === name);
		if (!item) throw new Error(`[docs] Registry item ${name} is missing from registry.json`);
		for (const file of item.files) {
			if (name === 'schema-engine-form-recipes' && !RECIPE_FILES.has(file.path)) continue;
			if (!file.target) throw new Error(`[docs] Registry file ${file.path} has no target`);
			copies.push([file.path, resolveTarget(file.target)]);
		}
	}

	const components = new Set(
		copies.filter(([, target]) => target.endsWith('.tsx')).map(([, target]) => target.slice(0, -4)),
	);
	const aliasPrefix = `${alias}/`;

	/** Points an import of a copied component at its `.react.tsx` file; any other specifier is unchanged. */
	function reactSpecifier(specifier: string, target: string): string {
		const resolved = specifier.startsWith(aliasPrefix)
			? specifier.slice(aliasPrefix.length)
			: specifier.startsWith('.')
				? posix.join(posix.dirname(target), specifier)
				: undefined;
		return resolved !== undefined && components.has(resolved) ? `${specifier}.react` : specifier;
	}

	await rm(root, { recursive: true, force: true });
	for (const [source, target] of copies) {
		let text = await readFile(join(repoRoot, source), 'utf8');
		if (source.endsWith('.ts') || source.endsWith('.tsx')) {
			text = text
				.replaceAll(/(['"])@\//g, `$1${alias}/`)
				.replaceAll(/(\bfrom\s+['"])([^'"]+)(['"])/g, (_, open, specifier, close) => {
					return `${open}${reactSpecifier(specifier, target)}${close}`;
				});
		}
		if (target.endsWith('.tsx') && !text.startsWith('/** @jsxImportSource react */')) {
			text = `/** @jsxImportSource react */\n${text}`;
		}
		const destination = join(root, target.endsWith('.tsx') ? `${target.slice(0, -4)}.react.tsx` : target);
		await mkdir(dirname(destination), { recursive: true });
		await writeFile(destination, text);
	}
	return copies.map(([, target]) => target);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
	const written = await copyRegistryDemo();
	console.log(`[docs] Copied ${written.length} registry files to src/generated/shadcn`);
}

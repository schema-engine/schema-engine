import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

const RECIPES_DIR_CANDIDATES = ['src/lib/recipes', 'apps/docs/src/lib/recipes'];

/**
 * Locates `src/lib/recipes` by walking up from the current working directory.
 *
 * @remarks
 * Neither `import.meta.url` nor `process.cwd()` is a stable anchor: Ecopages bundles server modules
 * into `.eco/.server-collections/` and runs them from another working directory, so a fixed relative
 * path breaks. The docs app, a monorepo checkout and the unit tests all resolve through the walk.
 */
function findRecipesDir(): string {
	let dir = process.cwd();
	for (let depth = 0; depth < 8; depth += 1) {
		for (const candidate of RECIPES_DIR_CANDIDATES) {
			const path = join(dir, candidate);
			if (existsSync(join(path, 'brand-theme.ts'))) return path;
		}
		const parent = dirname(dir);
		if (parent === dir) break;
		dir = parent;
	}
	throw new Error(`Unable to locate 'src/lib/recipes' from '${process.cwd()}'`);
}

let recipesDir: string | undefined;

/**
 * Reads a file of `src/lib/recipes` as text.
 *
 * @remarks
 * The recipes page shows the text of the files the demos run, so a snippet cannot drift from its demo.
 */
export function readRecipeSource(file: string): string {
	recipesDir ??= findRecipesDir();
	return readFileSync(join(recipesDir, file), 'utf8');
}

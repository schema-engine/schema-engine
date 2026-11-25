import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

/** The files of `src/lib/guide-sources/`: the ones the guide pages show and the helpers any docs page may import. */
export const guideSourcesRoot = join(import.meta.dirname, '../src/lib/guide-sources');

/** A file a test runs: `x.test.ts`, `x.test.tsx` or `x.test.browser.ts`. */
export const isTestFile = (name: string): boolean => /\.test(\.browser)?\.tsx?$/.test(name);

/**
 * A helper is a file a page imports and does not show: its name has `.helper` before its extension, as in
 * `i18n.helper.ts` or `widgets.helper.react.tsx`.
 *
 * @remarks
 * The name is the whole convention, so a reader of the page sees from the import (`./i18n.helper`) that the file is
 * not on the page. Every other file of an example folder or of the guide sources has to be shown word for word.
 */
export const isHelperFile = (name: string): boolean => /\.helper(\.react)?\.tsx?$/.test(name);

/** The relative import that names a file: `./` and its name without the last extension. */
export const importSpecifier = (name: string): string => `./${name.replace(/\.[^.]+$/, '')}`;

/** The files a page has to show and its helpers, from the names in a folder; tests are neither. */
export function splitSources(names: readonly string[]): { shown: string[]; helpers: string[] } {
	const sources = names.filter((name) => !isTestFile(name)).toSorted();
	return { shown: sources.filter((name) => !isHelperFile(name)), helpers: sources.filter(isHelperFile) };
}

/** The helpers among `helpers` that none of the `imported` specifiers names, so nothing needs them. */
export function unusedHelpers(helpers: readonly string[], imported: readonly string[]): string[] {
	return helpers.filter((name) => !imported.includes(importSpecifier(name)));
}

/** The text of every guide-source helper by file name, for the pages that import them. */
export function guideHelpers(root = guideSourcesRoot): Record<string, string> {
	return Object.fromEntries(
		splitSources(readdirSync(root)).helpers.map((name) => [name, readFileSync(join(root, name), 'utf8')]),
	);
}

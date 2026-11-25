import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { splitSources, unusedHelpers } from './helper-files';
import { shownExactly } from './shown-exactly';

/** One folder per example, each holding the files the example's page shows and the tests that run them. */
export const examplesRoot = join(import.meta.dirname, '../src/lib/examples');

/** The example pages, one per example folder, plus the overview and the pages that use another format. */
export const examplePagesRoot = join(import.meta.dirname, '../src/content/docs/examples');

export interface ExampleFile {
	name: string;
	source: string;
}

export interface Example {
	id: string;
	/** The files the page shows: every file of the folder that is not a test or a helper. */
	files: ExampleFile[];
	/** The helpers (`*.helper.ts`) the files import and the page does not show; a reader copies them from the repository. */
	helpers: ExampleFile[];
	/** The test files of the folder. */
	tests: ExampleFile[];
}

const PACKAGE_SPECIFIER = /^(@[a-z0-9~-][a-z0-9._~-]*\/)?[a-z0-9~-][a-z0-9._~-]*(\/.*)?$/;
const RELATIVE_SPECIFIER = /^\.\/[\w.-]+$/;

/** Reads every folder of `root` as an example, in id order. */
export function readExamples(root = examplesRoot): Example[] {
	if (!existsSync(root)) return [];
	return readdirSync(root, { withFileTypes: true })
		.filter((entry) => entry.isDirectory())
		.map((entry) => {
			const names = readdirSync(join(root, entry.name)).toSorted();
			const { shown, helpers } = splitSources(names);
			const read = (name: string) => ({ name, source: readFileSync(join(root, entry.name, name), 'utf8') });
			return {
				id: entry.name,
				files: shown.map(read),
				helpers: helpers.map(read),
				tests: names.filter((name) => !shown.includes(name) && !helpers.includes(name)).map(read),
			};
		})
		.toSorted((a, b) => a.id.localeCompare(b.id));
}

/** The module specifiers a file imports or re-exports, in either quote style. */
export function importsOf(source: string): string[] {
	return [...source.matchAll(/(?:from|import)\s*\(?\s*(['"])([^'"]+)\1/g)].map((match) => match[2]!);
}

/** Whether a relative specifier names one of the files: its name without the last extension, or the whole name. */
const namesFile = (specifier: string, names: readonly string[]): boolean =>
	names.some((name) => name === specifier.slice(2) || name.replace(/\.[^.]+$/, '') === specifier.slice(2));

/** The package a specifier names: `@scope/name` or `name`, without a subpath. */
export function packageOf(specifier: string): string {
	const parts = specifier.split('/');
	return specifier.startsWith('@') ? parts.slice(0, 2).join('/') : parts[0]!;
}

/**
 * The `pnpm add` commands of the page's Install section.
 *
 * @remarks
 * A example that runs in two renderers has one command for each, because their peers differ.
 */
export function installLines(page: string): string[] {
	const section = page.split(/^## /m).find((part) => /^Install\b/.test(part)) ?? '';
	return [...section.matchAll(/```(?:bash|sh)\n(pnpm add [^\n]+)\n```/g)].map((match) => match[1]!);
}

/**
 * Everything that makes an example fail the format: a file the page does not show word for word, an import that is
 * neither a package nor a sibling, a folder without a test that runs its files, a page without the install line its
 * files need, or an example the overview does not list.
 */
export function checkExample(example: Example, page: string | undefined, overview: string): string[] {
	const problems: string[] = [];
	const names = [...example.files, ...example.helpers].map((file) => file.name);
	if (example.files.length === 0) problems.push('has no files');

	for (const file of [...example.files, ...example.helpers]) {
		for (const specifier of importsOf(file.source)) {
			if (PACKAGE_SPECIFIER.test(specifier)) continue;
			if (!RELATIVE_SPECIFIER.test(specifier)) {
				problems.push(`${file.name} imports ${specifier}, which is not a package or a file of its own folder`);
			} else if (!namesFile(specifier, names)) {
				problems.push(`${file.name} imports ${specifier}, which is not a file of this example`);
			}
		}
	}

	const imported = [...example.files, ...example.helpers].flatMap((file) => importsOf(file.source));
	for (const name of unusedHelpers(
		example.helpers.map((helper) => helper.name),
		[...imported, ...example.tests.flatMap((test) => importsOf(test.source))],
	)) {
		problems.push(`the helper ${name} is not imported by any file`);
	}

	if (!example.tests.some((test) => importsOf(test.source).some((specifier) => RELATIVE_SPECIFIER.test(specifier)))) {
		problems.push('has no test that imports its files');
	}

	if (page === undefined) {
		problems.push(`has no page examples/${example.id}.mdx`);
		return problems;
	}

	problems.push(...shownExactly(example.files, page));

	const installs = installLines(page);
	if (installs.length === 0) {
		problems.push('the page has no "Install" section with a pnpm add command');
	} else {
		const installed = new Set(installs.flatMap((install) => install.split(/\s+/)));
		const importedPackages = new Set(imported.map(packageOf));
		for (const name of [...importedPackages].filter((specifier) => PACKAGE_SPECIFIER.test(specifier))) {
			if (!installed.has(name)) problems.push(`the install line lacks ${name}`);
		}
		if (installs.some((install) => !overview.includes(`\`${install}\``))) {
			problems.push('the overview does not list its install line');
		}
	}
	if (!overview.includes(`](/docs/examples/${example.id})`)) problems.push('the overview does not link to the page');

	return problems;
}

import {
	copyFileSync,
	existsSync,
	globSync,
	mkdirSync,
	mkdtempSync,
	readdirSync,
	readFileSync,
	rmSync,
	symlinkSync,
	writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

interface PackageEntries {
	readonly name: string;
	readonly dir: string;
	readonly specifiers: readonly string[];
}

/** The import specifiers a consumer writes for the entries of a package that ship types. */
function typedEntries(dir: string): PackageEntries {
	const manifest = JSON.parse(readFileSync(path.join(dir, 'package.json'), 'utf8')) as {
		name: string;
		exports?: Record<string, string | { types?: string }>;
	};
	const specifiers = Object.entries(manifest.exports ?? {})
		.filter(([, target]) => typeof target === 'object' && target.types !== undefined)
		.map(([key]) => (key === '.' ? manifest.name : `${manifest.name}${key.slice(1)}`));
	return { name: manifest.name, dir, specifiers };
}

/**
 * The type errors of a consumer that imports every typed entry of every built package.
 *
 * @param resolution - The module resolution the consumer compiles with
 *
 * @remarks
 * The consumer is a scratch project whose `node_modules` links each package, so it resolves the package by its
 * `exports` map as an installed one is. It compiles with `skipLibCheck: false`, so a declaration file that does not
 * type-check is an error, and every entry must export something: a declaration that fails to resolve its own imports
 * leaves an entry with no exports, which no error of the consumer would name.
 *
 * @remarks
 * It also compiles the consumer fixtures of the packages (`test/consumer/*.ts`), which read every public entry by name and
 * every removed entry under `@ts-expect-error`. They compile here, not in the package, because a package inside a
 * checkout that holds another install of the same package (a git worktree under the main checkout) would resolve a
 * removed subpath through that install's `node_modules`, and the scratch project has no ancestor to find one in.
 */
function consumerErrors(packages: readonly PackageEntries[], resolution: 'node16' | 'bundler'): string[] {
	const scratch = mkdtempSync(path.join(tmpdir(), 'dist-types-'));
	try {
		mkdirSync(path.join(scratch, 'node_modules', '@schema-engine'), { recursive: true });
		for (const { name, dir } of packages) {
			symlinkSync(dir, path.join(scratch, 'node_modules', name), 'dir');
		}
		writeFileSync(path.join(scratch, 'package.json'), JSON.stringify({ name: 'consumer', type: 'module' }));
		const specifiers = packages.flatMap((entry) => entry.specifiers);
		const source = specifiers
			.flatMap((specifier, index) => [
				`import * as entry${index} from '${specifier}';`,
				`export const keys${index}: [keyof typeof entry${index}] extends [never] ? never : true = true;`,
			])
			.join('\n');
		const file = path.join(scratch, 'consumer.ts');
		writeFileSync(file, source);
		const fixtures = packages.flatMap(({ dir }) =>
			globSync('test/consumer/*.ts', { cwd: dir }).map((fixture) => {
				const copy = path.join(scratch, 'fixtures', path.basename(dir), path.basename(fixture));
				mkdirSync(path.dirname(copy), { recursive: true });
				copyFileSync(path.join(dir, fixture), copy);
				return copy;
			}),
		);
		for (const name of ['forms-react', 'forms-radiant']) {
			if (!fixtures.some((fixture) => path.basename(path.dirname(fixture)) === name)) {
				throw new Error(
					`packages/${name}/test/consumer/ holds no fixture, so its published entries would go unchecked.`,
				);
			}
		}
		const program = ts.createProgram([file, ...fixtures], {
			strict: true,
			noEmit: true,
			skipLibCheck: false,
			target: ts.ScriptTarget.ESNext,
			lib: ['lib.esnext.d.ts', 'lib.dom.d.ts', 'lib.dom.iterable.d.ts'],
			jsx: ts.JsxEmit.ReactJSX,
			types: [],
			module: resolution === 'node16' ? ts.ModuleKind.Node16 : ts.ModuleKind.ESNext,
			moduleResolution:
				resolution === 'node16' ? ts.ModuleResolutionKind.Node16 : ts.ModuleResolutionKind.Bundler,
		});
		return ts.getPreEmitDiagnostics(program).map((diagnostic) => {
			const where = diagnostic.file
				? `${path.relative(diagnostic.file.fileName.startsWith(scratch) ? scratch : root, diagnostic.file.fileName)}:${diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start ?? 0).line + 1}`
				: 'program';
			return `${where} TS${diagnostic.code}: ${ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n')}`;
		});
	} finally {
		rmSync(scratch, { recursive: true, force: true });
	}
}

const packages = readdirSync(path.join(root, 'packages'))
	.map((name) => path.join(root, 'packages', name))
	.filter((dir) => existsSync(path.join(dir, 'package.json')))
	.map(typedEntries)
	.filter((entry) => entry.specifiers.length > 0);

for (const { dir, name } of packages) {
	if (!existsSync(path.join(dir, 'dist'))) {
		throw new Error(`${name} has no dist. Run pnpm build:lib first.`);
	}
}

let failed = false;
for (const resolution of ['node16', 'bundler'] as const) {
	const errors = consumerErrors(packages, resolution);
	if (errors.length === 0) {
		process.stdout.write(`[check-dist-types] ${resolution}: every entry of every package type-checks\n`);
		continue;
	}
	failed = true;
	process.stderr.write(
		`[check-dist-types] ${resolution}: ${errors.length} error(s) in the built declarations\n${errors.slice(0, 40).join('\n')}\n`,
	);
}
if (failed) process.exit(1);

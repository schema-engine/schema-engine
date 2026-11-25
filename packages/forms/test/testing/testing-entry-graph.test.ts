import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, test } from 'vitest';

const dist = fileURLToPath(new URL('../../dist/', import.meta.url));

const IMPORT = /(?:\bfrom|\bimport)\s*\(?\s*["']([^"']+)["']/g;

function sourcesUnder(dir: string): string[] {
	return readdirSync(dir, { recursive: true, withFileTypes: true })
		.filter((entry) => entry.isFile() && entry.name.endsWith('.js'))
		.map((entry) => path.join(entry.parentPath, entry.name));
}

/** Where each built file imports from: the files it reaches by a relative specifier, and whether it imports `vitest`. */
function importsOf(file: string) {
	const specifiers = [...readFileSync(file, 'utf8').matchAll(IMPORT)].map((match) => match[1] ?? '');
	return {
		reaches: specifiers
			.filter((specifier) => specifier.startsWith('.'))
			.map((specifier) => path.resolve(path.dirname(file), specifier)),
		vitest: specifiers.some((specifier) => specifier === 'vitest' || specifier.startsWith('vitest/')),
	};
}

const importsGraph = (files: string[]) => new Map(files.map((file) => [file, importsOf(file)] as const));

/** The built files an entry reaches by its relative imports, itself included. */
function reachableFrom(entry: string, graph: ReturnType<typeof importsGraph>): string[] {
	const seen = new Set<string>();
	const visit = (file: string) => {
		if (seen.has(file) || !graph.has(file)) return;
		seen.add(file);
		for (const next of graph.get(file)?.reaches ?? []) visit(next);
	};
	visit(entry);
	return [...seen];
}

test('no built entry reaches vitest, the testing entry included', () => {
	const files = sourcesUnder(dist);
	const graph = importsGraph(files);
	const entries = files.filter((file) => !path.basename(file).startsWith('chunk-'));
	const reachingVitest = (file: string) => reachableFrom(file, graph).some((reached) => graph.get(reached)?.vitest);

	expect(entries.length).toBeGreaterThan(10);
	expect(entries.filter(reachingVitest).map((file) => path.relative(dist, file))).toEqual([]);
	expect(reachableFrom(path.join(dist, 'testing', 'index.js'), graph).length).toBeGreaterThan(0);
});

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, test } from 'vitest';

const srcRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../src');
const radiantUiRoot = path.dirname(createRequire(import.meta.url).resolve('@ecopages/radiant-ui/package.json'));

function cssFilesIn(directory: string): string[] {
	return readdirSync(directory).flatMap((entry) => {
		const file = path.join(directory, entry);
		if (statSync(file).isDirectory()) return cssFilesIn(file);
		return file.endsWith('.css') ? [file] : [];
	});
}

function declaredIn(files: string[]): Set<string> {
	const names = new Set<string>();
	for (const file of files) {
		for (const match of readFileSync(file, 'utf8').matchAll(/(--[a-z0-9-]+)\s*:/g)) names.add(match[1]!);
	}
	return names;
}

/**
 * Custom properties the renderer CSS reads that Radiant UI does not define, each with the reason it is
 * safe to read: a name an app theme sets, with a fallback on every read. Empty today.
 */
const APP_HOOKS: Record<string, string> = {};

describe('the custom properties the Radiant renderer CSS reads', () => {
	const sources = cssFilesIn(srcRoot);
	const defined = new Set([
		...declaredIn(cssFilesIn(path.join(radiantUiRoot, 'dist/styles'))),
		...declaredIn(sources),
	]);
	const reads = new Map<string, Set<string>>();
	for (const file of sources) {
		const css = readFileSync(file, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
		for (const match of css.matchAll(/var\(\s*(--[a-z0-9-]+)\s*[,)]/g)) {
			if (match[1]!.startsWith('--se-')) continue;
			reads.set(match[1]!, (reads.get(match[1]!) ?? new Set()).add(path.relative(srcRoot, file)));
		}
	}

	test('reads at least one Radiant UI token, so the scan is not empty', () => {
		expect(reads.size).toBeGreaterThan(10);
		expect(defined.has('--space-4')).toBe(true);
	});

	test('every one is defined by Radiant UI, by the renderer itself, or listed as an app hook', () => {
		const unknown = [...reads].filter(([name]) => !defined.has(name) && !(name in APP_HOOKS));
		expect(unknown.map(([name, files]) => `${name} in ${[...files].join(', ')}`)).toEqual([]);
	});

	test('lists no app hook that Radiant UI now defines or the renderer no longer reads', () => {
		const stale = Object.keys(APP_HOOKS).filter((name) => defined.has(name) || !reads.has(name));
		expect(stale).toEqual([]);
	});
});

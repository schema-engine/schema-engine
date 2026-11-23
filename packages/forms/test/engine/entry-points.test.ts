import { readFileSync } from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import { describe, expect, test } from 'vitest';
import * as actions from '@/actions';
import * as engine from '@/engine';
import * as root from '@/index';

const packageDir = path.resolve(import.meta.dirname, '../..');
const { exports: exportMap } = JSON.parse(readFileSync(path.join(packageDir, 'package.json'), 'utf8')) as {
	exports: Record<string, { import?: string }>;
};

const FORM_ACTION_EXPORTS = [
	'formSubmitPlugin',
	'formResetPlugin',
	'notificationPlugin',
	'autoSavePlugin',
	'gtmPlugin',
	'FormActionTriggerSchema',
	'SubmitActionRegistration',
	'NotificationActionRegistration',
] as const;

/**
 * Every symbol each entry of the package's `exports` map exposes, values and types, by the declaration it resolves to.
 *
 * @remarks
 * An entry is read at the source file its `dist` path is built from, so the test needs no build. A re-export
 * names the same declaration as the original, so a symbol exported under the same name from two entries
 * is found whichever file declares it.
 */
function exportsByEntry(): Map<string, string[]> {
	const entries = Object.entries(exportMap).flatMap(([key, target]) =>
		target.import?.startsWith('./dist/') && target.import.endsWith('.js')
			? [
					[
						key,
						path.join(packageDir, 'src', target.import.slice('./dist/'.length).replace(/\.js$/, '.ts')),
					] as const,
				]
			: [],
	);
	const configFile = ts.readConfigFile(path.join(packageDir, 'tsconfig.json'), (file) => ts.sys.readFile(file));
	const { options } = ts.parseJsonConfigFileContent(configFile.config, ts.sys, packageDir);
	const program = ts.createProgram(
		entries.map(([, file]) => file),
		{ ...options, noEmit: true },
	);
	const checker = program.getTypeChecker();
	const symbols = new Map<string, string[]>();
	for (const [key, file] of entries) {
		const source = program.getSourceFile(file);
		const moduleSymbol = source && checker.getSymbolAtLocation(source);
		if (!moduleSymbol) throw new Error(`Entry ${key} has no module at ${file}`);
		symbols.set(
			key,
			checker.getExportsOfModule(moduleSymbol).map((exported) => {
				const target = exported.flags & ts.SymbolFlags.Alias ? checker.getAliasedSymbol(exported) : exported;
				const declaration = target.declarations?.[0]?.getSourceFile().fileName ?? 'unknown';
				return `${path.relative(packageDir, declaration)}#${target.name}`;
			}),
		);
	}
	return symbols;
}

describe('one import path per symbol', () => {
	test('the forms actions come from the package root', () => {
		for (const name of FORM_ACTION_EXPORTS) {
			expect(root, name).toHaveProperty(name);
			expect(actions, name).toHaveProperty(name);
		}
	});

	test('the dispatcher comes from @schema-engine/actions only', () => {
		expect(root).not.toHaveProperty('ActionDispatcher');
		expect(engine).not.toHaveProperty('ActionDispatcher');
		expect(actions).not.toHaveProperty('ActionDispatcher');
	});

	test('the package exposes the root and the entries that are separate from it', () => {
		expect(Object.keys(exportMap).toSorted()).toEqual([
			'.',
			'./agent-tool',
			'./browser',
			'./csrf',
			'./package.json',
			'./recipes',
			'./recipes/built-in',
			'./server-errors',
			'./state-container',
			'./testing',
		]);
	});

	test('no symbol is exported from two entries', () => {
		const owners = new Map<string, string[]>();
		for (const [entry, symbols] of exportsByEntry()) {
			for (const symbol of symbols) owners.set(symbol, [...(owners.get(symbol) ?? []), entry]);
		}
		const shared = [...owners]
			.filter(([, entries]) => entries.length > 1)
			.map(([symbol, entries]) => `${symbol}: ${entries.join(', ')}`);
		expect(shared).toEqual([]);
	});
});

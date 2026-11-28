import path from 'node:path';
import { describe, expect, test } from 'vitest';
import * as entry from '@schema-engine/forms-react/primitives';
import {
	entryExportNames,
	symbolsFromOtherPackages,
	symbolsSharedByEntries,
} from '../../../../test-utils/entry-exports';
import {
	exportsKeys,
	RENDERER_AUTHOR_CONTRACT,
	SHARED_RENDERER_ENTRIES,
} from '../../../../test-utils/renderer-entries';

const packageDir = path.resolve(import.meta.dirname, '../..');

test('a container element lays out its children with ChildGrid alone', () => {
	expect(entry).toHaveProperty('ChildGrid');
	expect(entry).not.toHaveProperty('useChildGridProps');
});

describe('the renderer entry layout', () => {
	test('the exports map holds the shared entries and ./hooks, nothing else', () => {
		expect(exportsKeys(packageDir).toSorted()).toEqual([...SHARED_RENDERER_ENTRIES, './hooks'].toSorted());
	});

	test('the root renders a form and holds nothing an author builds elements or recipes from', () => {
		const root = entryExportNames(packageDir, '.');
		expect(root).toEqual(
			[
				'FormEngineProvider',
				'FormEngineProviderProps',
				'FormProvider',
				'FormRenderer',
				'FormRendererProps',
			].toSorted(),
		);
		for (const name of RENDERER_AUTHOR_CONTRACT) expect(root).not.toContain(name);
	});

	test('/primitives holds the author contract and the view provider', () => {
		const primitives = entryExportNames(packageDir, './primitives');
		expect(primitives).toEqual(expect.arrayContaining([...RENDERER_AUTHOR_CONTRACT, 'ViewProvider']));
	});

	test('/debugger holds the debugger and its props, nothing else', () => {
		expect(entryExportNames(packageDir, './debugger')).toEqual(['FormDebugger', 'FormDebuggerProps']);
	});

	test('the engine context is internal: it is on no entry', () => {
		const exported = exportsKeys(packageDir)
			.filter((key) => key !== './package.json' && key !== './debugger.css')
			.flatMap((key) => entryExportNames(packageDir, key));
		for (const internal of ['FormEngineContext', 'FormEngineContextValue', 'createFormEngineContextValue']) {
			expect(exported).not.toContain(internal);
		}
	});

	test('every symbol has one import path: none is on two entries or declared by another package', () => {
		expect(symbolsSharedByEntries(packageDir)).toEqual([]);
		expect(symbolsFromOtherPackages(packageDir)).toEqual([]);
	});
});

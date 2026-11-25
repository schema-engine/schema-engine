import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, test } from 'vitest';
import { importsOf } from './example-format';
import { splitSources, unusedHelpers } from './helper-files';
import { docsPageIds, parseCodeBlocks, readPage } from './snippet-harness';
import { shownExactly } from './shown-exactly';

describe('the pages show the guide sources they run', () => {
	const sourcesDir = join(import.meta.dirname, '../src/lib/guide-sources');
	const docsRoot = join(import.meta.dirname, '../src/content/docs');

	/** The guide sources each page shows, which the tests of the guide sources run. */
	const shown: Record<string, string[]> = {
		'forms/form-state': ['react-form-status.react.tsx', 'react-typed-values.react.tsx'],
		'forms/issue-text': ['format-issue.ts'],
		'forms/server-errors': ['server-errors.ts'],
		'forms/csrf': ['csrf.ts'],
		'forms/wizard': ['checkout.ts', 'react-stepper.react.tsx', 'radiant-stepper.tsx'],
		'renderer-authors/write-a-renderer': ['engine.ts', 'plain-renderer.ts'],
		'renderer-authors/runtime': ['checkout-wizard.ts'],
		'renderer-authors/state-container': ['container.ts', 'hydration.ts'],
		'renderer-authors/native-validity': ['native-facts.ts'],
		'forms/agent-tool': ['agent-tool.react.tsx', 'radiant-agent-tool.tsx'],
		'forms-react/widgets': ['react-widgets.react.tsx'],
		'forms-react/getting-started': ['react-quick-start.react.tsx'],
		'forms-react/other-react-state': ['settings-panel.react.tsx'],
		'forms-radiant/getting-started': ['radiant-quick-start.tsx'],
		'forms-radiant/form-controls': ['radiant-summary.tsx', 'radiant-control.tsx'],
	};

	const read = (file: string) => ({ name: file, source: readFileSync(join(sourcesDir, file), 'utf8') });

	test.each(Object.entries(shown))(
		'%s shows its guide sources word for word, and no other titled file',
		(page, files) => {
			const text = readFileSync(join(docsRoot, `${page}.mdx`), 'utf8');
			expect(shownExactly(files.map(read), text)).toEqual([]);
		},
	);

	test('every guide source is listed, so none is shown untested', () => {
		expect(splitSources(readdirSync(sourcesDir)).shown).toEqual(Object.values(shown).flat().toSorted());
	});

	test('every helper is imported by a guide source, another helper or a fence of a page', () => {
		const { shown: sources, helpers } = splitSources(readdirSync(sourcesDir));
		const texts = [...sources, ...helpers].map((name) => readFileSync(join(sourcesDir, name), 'utf8'));
		const fences = docsPageIds().flatMap((page) => parseCodeBlocks(readPage(page)).map((block) => block.code));
		const imported = [...texts, ...fences].flatMap(importsOf);
		expect(unusedHelpers(helpers, imported)).toEqual([]);
	});
});

import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, test } from 'vitest';

describe('the pages show the recipes they run', () => {
	const recipesDir = join(import.meta.dirname, '../src/lib/form-recipes');
	const docsRoot = join(import.meta.dirname, '../src/content/docs');

	/** The page that shows each recipe file, which the tests of the recipes run. */
	const shown: Record<string, string[]> = {
		'engine.ts': ['forms/form-state'],
		'container.ts': ['forms/form-state'],
		'hydration.ts': ['forms/form-state'],
		'format-issue.ts': ['forms/issue-text'],
		'native-facts.ts': ['forms/native-validity'],
		'server-errors.ts': ['forms/server-errors'],
		'csrf.ts': ['forms/csrf'],
		'checkout-wizard.ts': ['forms/wizard'],
		'react-widgets.react.tsx': ['forms-react/widgets'],
		'react-quick-start.react.tsx': ['forms-react/getting-started'],
		'react-embed.react.tsx': ['forms/form-libraries'],
		'react-typed-values.react.tsx': ['forms/form-state'],
		'agent-tool.react.tsx': ['forms/agent-tool'],
		'radiant-agent-tool.tsx': ['forms/agent-tool'],
		'radiant-summary.tsx': ['forms-radiant/form-controls'],
		'radiant-control.tsx': ['forms-radiant/form-controls'],
	};

	/** A file as a page shows it: React files drop the pragma line that only the docs app's own compiler needs. */
	function asShown(file: string): string {
		const lines = readFileSync(join(recipesDir, file), 'utf8').trimEnd().split('\n');
		return (lines[0]!.startsWith('/** @jsxImportSource') ? lines.slice(1) : lines).join('\n');
	}

	test.each(Object.entries(shown))('%s is on its page, word for word', (file, pages) => {
		const fence = file.endsWith('.tsx') ? 'tsx' : 'ts';
		for (const page of pages) {
			const text = readFileSync(join(docsRoot, `${page}.mdx`), 'utf8');
			expect(text, `${page} shows ${file}`).toContain(`\`\`\`${fence}\n${asShown(file)}\n\`\`\``);
		}
	});

	test('every recipe file is listed, so none is shown untested', () => {
		const files = readdirSync(recipesDir).filter((name) => !name.includes('.test.'));
		expect(files.toSorted()).toEqual(Object.keys(shown).toSorted());
	});

	test('no page or generated copy names a form library the engine does not use', () => {
		const pages = readdirSync(docsRoot, { recursive: true }) as string[];
		for (const page of pages.filter((name) => name.endsWith('.mdx'))) {
			const text = readFileSync(join(docsRoot, page), 'utf8');
			expect(text, page).not.toMatch(/rhfAdapter|react-hook-form/);
		}
	});
});

import { describe, expect, test } from 'vitest';
import { asShown, shownExactly } from './shown-exactly';

const fence = (name: string, language: string, body: string) => `\`\`\`${language} title="${name}"\n${body}\n\`\`\``;

describe('shownExactly', () => {
	const files = [
		{ name: 'main.ts', source: "import { a } from './a';\nexport const b = a;\n" },
		{ name: 'view.react.tsx', source: '/** @jsxImportSource react */\nexport const View = () => <p />;\n' },
	];
	const page = [
		'Some prose.',
		fence('main.ts', 'ts', "import { a } from './a';\nexport const b = a;"),
		'```bash\npnpm add zod\n```',
		fence('view.react.tsx', 'tsx', 'export const View = () => <p />;'),
	].join('\n\n');

	test('accepts a page that shows every file word for word and nothing titled besides', () => {
		expect(shownExactly(files, page)).toEqual([]);
	});

	test('fails a file the page does not show, or shows with one character changed', () => {
		expect(
			shownExactly(files, page.replace(fence('view.react.tsx', 'tsx', 'export const View = () => <p />;'), '')),
		).toEqual(['the page does not show view.react.tsx word for word']);
		expect(shownExactly(files, page.replace('export const b = a;', 'export const b = a2;'))).toEqual([
			'the page does not show main.ts word for word',
		]);
	});

	test('fails a titled fence for a file that is not one of the files', () => {
		const extra = `${page}\n\n${fence('other.ts', 'ts', 'export const c = 1;')}`;
		expect(shownExactly(files, extra)).toEqual(['the page shows other.ts, which is not one of the files']);
	});

	test('leaves an untitled fence alone, and fails a file whose type a fence cannot carry', () => {
		expect(shownExactly(files, `${page}\n\n\`\`\`ts\nexport const free = 1;\n\`\`\``)).toEqual([]);
		expect(shownExactly([{ name: 'notes.md', source: 'text\n' }], '')).toEqual([
			'notes.md has a type the page cannot show',
		]);
	});

	test('drops only the React pragma line and the final newline', () => {
		expect(asShown(files[1]!.source)).toBe('export const View = () => <p />;');
		expect(asShown('const a = 1;\n\n')).toBe('const a = 1;');
	});
});

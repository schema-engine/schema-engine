import { describe, expect, test } from 'vitest';
import { codeBlocks, docsPageIds } from './snippet-harness';

/**
 * The longest line a code fence of a docs page may have, with a tab counted as four columns, as Prettier counts it.
 *
 * @remarks
 * It is the print width of the repository, so source that Prettier formats never goes past it. Markup output is shown
 * formatted (see `format-html.ts`), and a comment or a string is wrapped by hand. A longer line scrolls sideways in
 * the code column, and a reader loses the end of it. Shell fences are exempt: a command such as `pnpm add` is one
 * line, so that it can be copied and run as it is.
 */
const MAX_LINE = 120;
const SHELL = new Set(['bash', 'sh', 'shell']);

const width = (line: string): number => line.replaceAll('\t', '    ').length;

describe('the code fences of the docs pages', () => {
	test.each(docsPageIds())('%s has no line longer than the code column', (page) => {
		const tooLong = codeBlocks(page)
			.filter((block) => !SHELL.has(block.lang))
			.flatMap((block) => block.code.split('\n').filter((line) => width(line) > MAX_LINE))
			.map((line) => `${width(line)}: ${line.trim().slice(0, 70)}`);
		expect(tooLong).toEqual([]);
	});
});

import { format, resolveConfig } from 'prettier';

const OUTPUT_WIDTH = 100;

/**
 * Formats the HTML a docs program prints, the way the docs pages show it.
 *
 * @remarks
 * A program prints its markup with one element per `console.log`, and a page shows it formatted: one element per
 * line and long attributes wrapped, so no line of the page runs past the code column. A test that compares a shown
 * block with the program's real output formats the real output here first, and the check stays exact.
 *
 * @remarks
 * The width is narrower than the repository's print width (120) because the code column of a docs page holds about
 * 100 characters of the code font at the widest layout. Prettier would format a fence at 120, so a page puts a
 * `prettier-ignore` comment above each `html` output fence, and leaves the formatting to this function and to the
 * test that compares the two.
 */
export async function formatHtml(html: string): Promise<string> {
	const config = await resolveConfig(new URL('./output.html', import.meta.url).pathname);
	return (await format(html, { ...config, parser: 'html', printWidth: OUTPUT_WIDTH })).trimEnd();
}

/** One block of what a program printed, as a docs page fences it: markup in `html`, anything else in `text`. */
export interface OutputBlock {
	lang: 'html' | 'text';
	code: string;
}

/**
 * Splits the lines a program printed into the blocks the page shows: each run of lines that start with a tag is an
 * `html` block, formatted by {@link formatHtml}, and each run of other lines is a `text` block.
 */
export async function outputBlocks(lines: readonly string[]): Promise<OutputBlock[]> {
	const runs: { lang: OutputBlock['lang']; lines: string[] }[] = [];
	for (const line of lines) {
		const lang = line.trimStart().startsWith('<') ? 'html' : 'text';
		const last = runs.at(-1);
		if (last?.lang === lang) last.lines.push(line);
		else runs.push({ lang, lines: [line] });
	}
	return Promise.all(
		runs.map(async ({ lang, lines: run }) => ({
			lang,
			code: lang === 'html' ? await formatHtml(run.join('\n')) : run.join('\n'),
		})),
	);
}

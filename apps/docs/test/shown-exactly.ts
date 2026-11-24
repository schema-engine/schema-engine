/** A file a page has to show: its name, which a fence carries as `title="<name>"`, and its text. */
export interface ShownFile {
	name: string;
	source: string;
}

interface TitledFence {
	title: string;
	language: string;
	body: string;
}

const FENCE_LANGUAGE: Record<string, string> = { ts: 'ts', tsx: 'tsx', css: 'css', json: 'json', yaml: 'yaml' };
const TITLED_FENCE = /^```(\w*) title="([^"]+)"\n([\s\S]*?)\n```$/gm;

/**
 * A file as its page shows it: a React file drops the pragma line that only the docs app's own compiler needs.
 *
 * @remarks
 * The page also leaves out the final newline, which the highlighter hides.
 */
export function asShown(source: string): string {
	const lines = source.trimEnd().split('\n');
	return (lines[0]!.startsWith('/** @jsxImportSource') ? lines.slice(1) : lines).join('\n');
}

const titledFences = (pageText: string): TitledFence[] =>
	[...pageText.matchAll(TITLED_FENCE)].map((match) => ({ language: match[1]!, title: match[2]!, body: match[3]! }));

/**
 * What stops a page from showing exactly these files, in both directions: a file the page does not show word for
 * word, and a titled fence that is not one of the files. An empty list means the page and the files agree.
 *
 * @remarks
 * Every kind of page that shows files, the example pages, the guide pages and the skill references, is held to this
 * one check. A fence with no title is prose and is not looked at, so a page can still hold snippets of its own.
 */
export function shownExactly(files: readonly ShownFile[], pageText: string): string[] {
	const fences = titledFences(pageText);
	const problems: string[] = [];
	for (const file of files) {
		const language = FENCE_LANGUAGE[file.name.split('.').at(-1)!];
		if (!language) problems.push(`${file.name} has a type the page cannot show`);
		else if (
			!fences.some(
				(fence) =>
					fence.title === file.name && fence.language === language && fence.body === asShown(file.source),
			)
		) {
			problems.push(`the page does not show ${file.name} word for word`);
		}
	}
	for (const fence of fences) {
		if (!files.some((file) => file.name === fence.title)) {
			problems.push(`the page shows ${fence.title}, which is not one of the files`);
		}
	}
	return problems;
}

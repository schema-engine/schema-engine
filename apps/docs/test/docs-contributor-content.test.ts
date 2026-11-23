import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, test } from 'vitest';
import { docsPageIds, readPage } from './snippet-harness';

const repository = join(import.meta.dirname, '../../..');

/** What only a contributor needs: the monorepo's tooling and the docs app's own files. */
const CONTRIBUTOR = [
	/storybook/i,
	/\bapps\/docs\b/,
	/\bpackages\/[a-z-]+\//,
	/\bregistry\/shared\b/,
	/\bdocs app\b/i,
	/\bpnpm (?:--filter|turbo|dev:|build:)/,
];

/** A sentence about an API that no longer exists. Nothing is released, so there is nothing to migrate from. */
const REMOVED_API = [
	/\b(?:has|have) been removed\b/i,
	/\bno longer (?:exists?|takes?|supported|used|part)\b/i,
	/\bthe former\b/i,
	/\bwas removed\b/i,
	/\bmigrat(?:e|ion) (?:from|guide|notes?)\b/i,
];

const packageReadmes = readdirSync(join(repository, 'packages')).map((name) => `packages/${name}/README.md`);

function violations(text: string, patterns: RegExp[]): string[] {
	return text
		.replace(/```[\s\S]*?```/g, (fence) => fence.replace(/[^\n]/g, ' '))
		.split('\n')
		.flatMap((line, index) =>
			patterns.filter((pattern) => pattern.test(line)).map(() => `${index + 1}: ${line.trim()}`),
		);
}

describe('the user pages', () => {
	test.each(docsPageIds())('%s has no contributor content and describes no removed API', (page) => {
		const text = readPage(page);
		expect(violations(text, CONTRIBUTOR)).toEqual([]);
		expect(violations(text, REMOVED_API)).toEqual([]);
	});
});

describe('the READMEs', () => {
	test.each(['README.md', ...packageReadmes])('%s describes no removed API', (readme) => {
		expect(violations(readFileSync(join(repository, readme), 'utf8'), REMOVED_API)).toEqual([]);
	});
});

describe('the guard', () => {
	test('flags a Storybook command, a repository path and a removed-API sentence, and leaves prose alone', () => {
		const text = [
			'Run Storybook with pnpm dev:react-storybook.',
			'The former `ActionExecutor` has been removed.',
			'Open apps/docs/src.',
			'Rules run in order.',
		].join('\n');
		expect(violations(text, CONTRIBUTOR)).toHaveLength(3);
		expect(violations(text, REMOVED_API)).toHaveLength(2);
		expect(violations('Use `rules` to validate.', [...CONTRIBUTOR, ...REMOVED_API])).toEqual([]);
	});
});

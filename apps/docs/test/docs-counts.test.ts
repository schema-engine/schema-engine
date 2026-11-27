import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, test } from 'vitest';
import { createFormEngine } from '@schema-engine/forms';
import { schemaFormRegistrations } from '@schema-engine/forms-radiant';
import { registrationType } from './element-contract-types';
import { readPage } from './snippet-harness';

const repository = join(import.meta.dirname, '../../..');

/** The names in backticks of the first cell of each row of the tables whose header starts with `header`. */
function firstColumn(page: string, header: string): string[] {
	const names: string[] = [];
	let inTable = false;
	for (const line of readPage(page).split('\n')) {
		if (!line.startsWith('|')) {
			inTable = false;
			continue;
		}
		const [first = ''] = line.slice(1).split('|');
		if (first.trim().startsWith(header)) {
			inTable = true;
			continue;
		}
		if (inTable && !/^\s*-+\s*$/.test(first))
			names.push(...[...first.matchAll(/`([^`]+)`/g)].map((match) => match[1]!));
	}
	return names;
}

/** The numbers a page gives before a noun, such as `27` in "the 27 built-in rules". */
function numbersBefore(page: string, noun: RegExp): number[] {
	return [...readPage(page).matchAll(new RegExp(`\\b(\\d+) (?:[a-z-]+ )?${noun.source}`, 'g'))].map((match) =>
		Number(match[1]),
	);
}

/** The `$type` of each registration the generated barrel of the shadcn registry exports, read from its source. */
function registryElementTypes(): string[] {
	const folder = join(repository, 'registry/shared/forms');
	const barrel = readFileSync(join(folder, 'registrations.ts'), 'utf8');
	return [...barrel.matchAll(/from '(\.\/[^']+)'/g)].map((match) => {
		return registrationType(readFileSync(join(folder, `${match[1]}.ts`), 'utf8'))!;
	});
}

describe('the validation rules the docs list', () => {
	const registered = createFormEngine({ elements: [] }).getValidationRegistry();

	test('the count the pages state is the number of rules the engine registers', () => {
		for (const page of ['forms/overview', 'forms/validation', 'forms/getting-started']) {
			const counts = numbersBefore(page, /(?:validation )?rules?\b/);
			expect(counts.length, `${page} states a count`).toBeGreaterThan(0);
			expect(new Set(counts), page).toEqual(new Set([registered.size]));
		}
	});

	test('the tables of the validation page list every registered rule once', () => {
		const listed = firstColumn('forms/validation', '`$type`');
		expect(listed.toSorted()).toEqual(registered.keys().toSorted());
	});
});

describe('the Radiant elements the docs list', () => {
	const shipped = schemaFormRegistrations.map((registration) => registration.$type);

	test('the overview table lists every registration the package ships', () => {
		expect(firstColumn('forms-radiant/overview', '`$type`').toSorted()).toEqual(shipped.toSorted());
	});

	test('the counts the overview states are the number of registrations', () => {
		const counts = [
			...numbersBefore('forms-radiant/overview', /element registrations/),
			...numbersBefore('forms-radiant/overview', /elements it ships/),
		];
		expect(counts.length).toBeGreaterThan(0);
		expect(new Set(counts)).toEqual(new Set([shipped.length]));
	});
});

describe('the React registry elements the docs list', () => {
	test('the Registry fields table lists the $type of every element the aggregate item installs', () => {
		expect(firstColumn('forms-react/components', '`$type`').toSorted()).toEqual(registryElementTypes().toSorted());
	});
});

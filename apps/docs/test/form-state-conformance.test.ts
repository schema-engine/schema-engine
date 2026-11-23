import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, test } from 'vitest';
import { createFormStateContainer } from '@schema-engine/forms/state-container';

const specifier = '@schema-engine/forms/testing';
const testing = (await import(/* @vite-ignore */ specifier).catch(() => undefined)) as
	{ formStateContainerConformance: (factory: typeof createFormStateContainer) => void } | undefined;

const page = readFileSync(join(import.meta.dirname, '../src/content/docs/forms/form-state.mdx'), 'utf8');

test('the form state page documents the suite by the name the package exports', () => {
	expect(page).toContain("import { formStateContainerConformance } from '@schema-engine/forms/testing';");
	expect(page).toContain('formStateContainerConformance(createFormStateContainer);');
});

/**
 * Runs the call the page shows against the package that exports it.
 *
 * @remarks
 * Skipped until `@schema-engine/forms/testing` exists in the installed `@schema-engine/forms`.
 */
describe.skipIf(!testing)('the documented conformance call', () => {
	testing?.formStateContainerConformance(createFormStateContainer);
	test('runs the suite against the reference container', () => {
		expect(typeof testing?.formStateContainerConformance).toBe('function');
	});
});

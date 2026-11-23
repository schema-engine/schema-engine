import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test } from 'vitest';

const page = readFileSync(join(import.meta.dirname, '../src/content/docs/forms/form-state.mdx'), 'utf8');

test('the form state page documents the suite by the name the package exports', () => {
	expect(page).toContain("import { formStateContainerConformance } from '@schema-engine/forms/testing';");
	expect(page).toContain('formStateContainerConformance(createFormStateContainer);');
});

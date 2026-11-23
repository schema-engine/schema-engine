import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { expect, test } from 'vitest';
import pkg from '../../package.json' with { type: 'json' };
import { createFormStateContainer } from '@schema-engine/forms/state-container';
import { formStateContainerConformance } from '@schema-engine/forms/testing';

const root = fileURLToPath(new URL('../../', import.meta.url));

test('the testing entry is declared with built code and types, and vitest is an optional peer', () => {
	const entry = pkg.exports['./testing'];
	expect(entry).toEqual({ types: './dist/testing/index.d.ts', import: './dist/testing/index.js' });
	expect(existsSync(`${root}${entry.import}`)).toBe(true);
	expect(existsSync(`${root}${entry.types}`)).toBe(true);
	expect(pkg.peerDependenciesMeta.vitest).toEqual({ optional: true });
});

formStateContainerConformance(createFormStateContainer);

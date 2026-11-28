import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { expect, test } from 'vitest';

const elementsDir = path.resolve(import.meta.dirname, '../../src/elements');

const registrationModules = readdirSync(elementsDir, { recursive: true, encoding: 'utf8' })
	.filter((file) => file.endsWith('.registration.ts'))
	.toSorted();

test('there is one registration module per default element', () => {
	expect(registrationModules).toHaveLength(18);
});

test.each(registrationModules)(
	'%s imports its own widget and no other registration module or aggregate, so it loads alone',
	(file) => {
		const source = readFileSync(path.join(elementsDir, file), 'utf8');
		const specifiers = [...source.matchAll(/from '([^']+)'/g)].map(([, specifier]) => specifier);

		expect(specifiers.filter((specifier) => /registration|registrations|radiant-elements/.test(specifier))).toEqual(
			[],
		);
		expect(specifiers).toContain(`./${path.basename(file, '.registration.ts')}.js`);
	},
);

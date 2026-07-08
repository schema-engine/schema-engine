import { describe, expect, test } from 'bun:test';
import { Glob } from 'bun';
import path from 'node:path';
import { TYPE_MANIFEST } from '@/types-manifest';

async function collectRegistrationTypes(globPattern: string): Promise<Set<string>> {
	const glob = new Glob(globPattern);
	const types = new Set<string>();
	const root = path.join(import.meta.dir, '../../src');

	for await (const relativePath of glob.scan({ cwd: root })) {
		const source = await Bun.file(path.join(root, relativePath)).text();
		const match = source.match(/\$type:\s*['"]([^'"]+)['"]/);

		if (!match) {
			throw new Error(`Missing $type in ${relativePath}`);
		}

		types.add(match[1]);
	}

	return types;
}

describe('types-manifest', () => {
	test('element keys match built-in registration $type values', async () => {
		const manifestKeys = new Set(Object.keys(TYPE_MANIFEST.elements));
		const registrationTypes = await collectRegistrationTypes('components/elements/**/*.registration.ts');

		expect(manifestKeys).toEqual(registrationTypes);
	});

	test('layout keys match built-in registration $type values', async () => {
		const manifestKeys = new Set(Object.keys(TYPE_MANIFEST.layouts));
		const registrationTypes = await collectRegistrationTypes('components/layouts/*.registration.ts');

		expect(manifestKeys).toEqual(registrationTypes);
	});

	test('stepper keys match built-in registration $type values', async () => {
		const manifestKeys = new Set(Object.keys(TYPE_MANIFEST.steppers));
		const registrationTypes = await collectRegistrationTypes('components/steppers/*.registration.ts');

		expect(manifestKeys).toEqual(registrationTypes);
	});
});

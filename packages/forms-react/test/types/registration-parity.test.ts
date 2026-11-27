/**
 * Asserts that every registration file of the shared form elements is registered, under a unique $type.
 * Form element registrations live in registry/shared/forms; their $type comes from the element contract of
 * `@schema-engine/forms/default-elements` or, for the date elements, from the registration itself.
 * View recipe implementations live in the registry source.
 */

import { describe, expect, test } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { schemaFormRegistrations } from '@/components/schema-engine/forms/registrations';
import { schemaFormRecipeRegistrations } from '@/components/schema-engine/forms/recipes/registrations';

const testDir = path.dirname(fileURLToPath(import.meta.url));
const SHARED_FORMS_ROOT = path.join(testDir, '..', '..', '..', '..', 'registry/shared/forms');

function listRegistrationFiles(root: string, dir: string): string[] {
	const absolute = path.join(root, dir);
	if (!fs.existsSync(absolute)) return [];
	const out: string[] = [];
	for (const entry of fs.readdirSync(absolute, { withFileTypes: true })) {
		if (entry.isDirectory()) {
			out.push(...listRegistrationFiles(root, path.join(dir, entry.name)));
		} else if (entry.isFile() && entry.name.endsWith('.registration.ts')) {
			out.push(path.join(dir, entry.name));
		}
	}
	return out;
}

function countRegistrationFiles(root: string, dir: string, label: string) {
	const files = listRegistrationFiles(root, dir);
	if (files.length === 0) throw new Error(`No registration file in ${label}/${dir}`);
	return files.length;
}

describe('registration parity', () => {
	test('shared form element registrations declare unique $type values', () => {
		const files = ['inputs', 'content', 'actions'].reduce(
			(count, dir) => count + countRegistrationFiles(SHARED_FORMS_ROOT, dir, 'shared-forms'),
			0,
		);
		const types = schemaFormRegistrations.map((registration) => registration.$type);

		expect(files).toBeGreaterThan(0);
		expect(new Set(types).size).toBe(types.length);
		expect(types.length).toBe(files);
	});

	test('registry default recipes declare unique $type values', () => {
		const types = schemaFormRecipeRegistrations.map((recipe) => recipe.$type);
		expect(types.length).toBeGreaterThan(0);
		expect(new Set(types).size).toBe(types.length);
	});
});

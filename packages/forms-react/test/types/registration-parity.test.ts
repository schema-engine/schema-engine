/**
 * Walks registration files and asserts unique $type literals.
 * Form element registrations live in registry/shared/forms.
 * View recipes live in the package recipe table.
 */

import { describe, expect, test } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { builtInRecipes } from '@/recipes';

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

function extractTypeLiteral(source: string): string | null {
	const match = source.match(/\$type:\s*['"]([^'"]+)['"]/);
	return match ? match[1] : null;
}

function scan(root: string, dir: string, label: string) {
	const files = listRegistrationFiles(root, dir);
	const types = new Set<string>();
	for (const relative of files) {
		const source = fs.readFileSync(path.join(root, relative), 'utf8');
		const value = extractTypeLiteral(source);
		if (!value) {
			throw new Error(`Missing $type literal in ${label}/${relative}`);
		}
		types.add(value);
	}
	return { files: files.length, types };
}

describe('registration parity', () => {
	test('shared form element registrations declare unique $type values', () => {
		const inputs = scan(SHARED_FORMS_ROOT, 'inputs', 'shared-forms');
		const content = scan(SHARED_FORMS_ROOT, 'content', 'shared-forms');
		const actions = scan(SHARED_FORMS_ROOT, 'actions', 'shared-forms');
		const files = inputs.files + content.files + actions.files;
		const types = new Set([...inputs.types, ...content.types, ...actions.types]);

		expect(files).toBeGreaterThan(0);
		expect(types.size).toBe(files);
	});

	test('built-in recipes declare unique $type values', () => {
		const types = builtInRecipes.map((recipe) => recipe.$type);
		expect(types.length).toBeGreaterThan(0);
		expect(new Set(types).size).toBe(types.length);
	});
});

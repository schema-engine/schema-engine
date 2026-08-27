/**
 * Walks registration files and asserts unique $type literals.
 * Form/stepper registrations live in registry/shared/forms.
 * Layout registrations stay package-owned.
 */

import { describe, expect, test } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const testDir = path.dirname(fileURLToPath(import.meta.url));
const PACKAGE_SRC_ROOT = path.join(testDir, '..', '..', 'src');
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
		const result = scan(SHARED_FORMS_ROOT, '.', 'shared-forms');
		expect(result.files).toBeGreaterThan(0);
		expect(result.types.size).toBe(result.files);
	});

	test('package layout registrations declare unique $type values', () => {
		const result = scan(PACKAGE_SRC_ROOT, 'components/layouts', 'package-layouts');
		expect(result.files).toBeGreaterThan(0);
		expect(result.types.size).toBe(result.files);
	});
});

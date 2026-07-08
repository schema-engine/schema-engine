/**
 * Walks the registration files under src/components, extracts the declared
 * $type literal, and asserts non-empty, unique values within each category
 * (element / layout / stepper).
 */

import { describe, expect, test } from 'bun:test';
import fs from 'node:fs';
import path from 'node:path';

const SRC_ROOT = path.join(import.meta.dir, '..', '..', 'src');

const CATEGORIES = [
	{ dir: 'components/elements', name: 'element' },
	{ dir: 'components/layouts', name: 'layout' },
	{ dir: 'components/steppers', name: 'stepper' },
] as const;

type Category = (typeof CATEGORIES)[number]['name'];

interface ScanResult {
	category: Category;
	types: Set<string>;
	files: number;
}

function listRegistrationFiles(dir: string): string[] {
	const absolute = path.join(SRC_ROOT, dir);
	if (!fs.existsSync(absolute)) return [];
	const out: string[] = [];
	for (const entry of fs.readdirSync(absolute, { withFileTypes: true })) {
		if (entry.isDirectory()) {
			out.push(...listRegistrationFiles(path.join(dir, entry.name)));
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

function scanCategory(dir: string, category: Category): ScanResult {
	const files = listRegistrationFiles(dir);
	const types = new Set<string>();
	for (const relative of files) {
		const source = fs.readFileSync(path.join(SRC_ROOT, relative), 'utf8');
		const value = extractTypeLiteral(source);
		if (!value) {
			throw new Error(`Missing $type literal in ${relative}. Every registration must declare a string $type.`);
		}
		types.add(value);
	}
	return { category, types, files: files.length };
}

describe('registration parity', () => {
	const results = CATEGORIES.map((c) => scanCategory(c.dir, c.name));

	for (const result of results) {
		test(`${result.category} registrations declare unique, non-empty $type values`, () => {
			expect(result.files).toBeGreaterThan(0);
			expect(result.types.size).toBe(result.files);
			expect(result.types.size).toBeGreaterThan(0);
		});
	}
});

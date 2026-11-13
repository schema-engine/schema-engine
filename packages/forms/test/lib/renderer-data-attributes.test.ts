import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { describe, expect, test } from 'vitest';
import { builtInAxes, defineAxis } from '@schema-engine/layout';
import { createFormEngine } from '@/engine/create-form-engine';
import { RENDERER_DATA_ATTRIBUTES } from '@/lib/renderer-data-attributes';

const repositoryRoot = resolve(__dirname, '../../../..');
const rendererSources = ['packages/forms-react/src', 'packages/forms-radiant/src', 'registry/shared'];
const sourceFile = /\.(?:tsx?|css)$/;

function listFiles(directory: string): string[] {
	return readdirSync(directory).flatMap((entry) => {
		const path = join(directory, entry);
		return statSync(path).isDirectory() ? listFiles(path) : sourceFile.test(entry) ? [path] : [];
	});
}

function dataAttributeNames(): Set<string> {
	const names = new Set<string>();
	for (const source of rendererSources) {
		for (const file of listFiles(join(repositoryRoot, source))) {
			for (const match of readFileSync(file, 'utf8').matchAll(/data-se-([a-z][a-z-]*)/g)) {
				names.add(match[1]);
			}
		}
	}
	return names;
}

describe('renderer data attributes', () => {
	test('every data-se-* name a renderer writes is reserved or a built-in axis', () => {
		const axes = Object.keys(createFormEngine().getLayout().axes);
		const unaccounted = [...dataAttributeNames()].filter(
			(name) => !(RENDERER_DATA_ATTRIBUTES as readonly string[]).includes(name) && !axes.includes(name),
		);
		expect(unaccounted).toEqual([]);
	});

	test.each(RENDERER_DATA_ATTRIBUTES)('an axis named %s is rejected', (name) => {
		const reserved = defineAxis({ $type: name, metadata: { name }, default: 'a', values: { a: {}, b: {} } });
		expect(() => createFormEngine({ layout: { appearance: [...builtInAxes, reserved] } })).toThrowError(/reserved/);
	});
});

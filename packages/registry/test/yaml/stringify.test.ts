import { describe, expect, test } from 'vitest';
import { parseYaml, stringifyYaml } from '@/yaml';

const accept = (value: unknown) => ({ success: true as const, data: value });

describe('stringifyYaml', () => {
	test('writes a short leaf map in flow style and other collections in block style', () => {
		const text = stringifyYaml({
			$type: 'text',
			grid: { width: 'half' },
			options: ['a', 'b'],
			nested: { inner: { deep: 1 } },
			items: [{ id: 'a', name: 'a' }],
		});

		expect(text).toBe(
			[
				'$type: text',
				'grid: { width: half }',
				'options:',
				'  - a',
				'  - b',
				'nested:',
				'  inner: { deep: 1 }',
				'items:',
				'  - id: a',
				'    name: a',
				'',
			].join('\n'),
		);
	});

	test('keeps a map with many or long entries in block style', () => {
		const text = stringifyYaml({
			many: { a: 1, b: 2, c: 3, d: 4 },
			long: { message: 'this value is much too long to sit comfortably on one line' },
			multiline: { note: 'one\ntwo' },
		});

		expect(text).not.toContain('{');
	});

	test('writes an object used twice out twice, without anchors or aliases', () => {
		const grid = { width: 'half' };

		const text = stringifyYaml({ a: { grid }, b: { grid }, list: [grid, grid] });

		expect(text).not.toMatch(/[&*]/);
		expect(parseYaml(text, accept)).toEqual({ a: { grid }, b: { grid }, list: [grid, grid] });
	});

	test('does not fold long strings', () => {
		const label = 'word '.repeat(40).trim();

		const text = stringifyYaml({ label });

		expect(text).toBe(`label: ${label}\n`);
	});

	test('quotes strings that would read as numbers', () => {
		const text = stringifyYaml({ version: '1.10' });

		expect(text).toBe('version: "1.10"\n');
		expect(parseYaml(text, accept)).toEqual({ version: '1.10' });
	});

	test('adds the yaml-language-server header with schemaUrl', () => {
		expect(stringifyYaml({ a: 1 }, { schemaUrl: 'https://example.com/form.schema.json' })).toBe(
			'# yaml-language-server: $schema=https://example.com/form.schema.json\na: 1\n',
		);
	});

	test('rejects a schemaUrl that is not one line', () => {
		expect(() => stringifyYaml({ a: 1 }, { schemaUrl: 'https://example.com\nb: 2' })).toThrow(TypeError);
	});

	test.each([
		['a map', { '<<': { port: 80 }, name: 'a' }],
		['a scalar', { '<<': 5 }],
		['a list', { nested: { '<<': [1, 2] } }],
		['a short leaf map', { a: { '<<': 'x' } }],
	])('a literal << key with %s round-trips and is not read as a merge', (_name, value) => {
		const text = stringifyYaml(value);

		expect(text).toContain('"<<":');
		expect(parseYaml(text, accept)).toEqual(value);
	});

	test('round-trips values through parseYaml', () => {
		const value = {
			title: 'Contact',
			count: 3,
			ok: true,
			nothing: null,
			text: 'no',
			grid: { width: 'half', start: 1 },
			list: [{ id: 'a', tags: ['x', 'y'] }, 'plain', 4],
			empty: {},
			emptyList: [],
		};

		expect(parseYaml(stringifyYaml(value, { schemaUrl: 'https://example.com/s.json' }), accept)).toEqual(value);
	});
});

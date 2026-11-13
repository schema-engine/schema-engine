import { describe, expect, test, vi } from 'vitest';
import * as z from 'zod';
import { YamlDocumentError, parseYaml, safeParseYaml } from '@/yaml';
import type { YamlValidate } from '@/yaml';

/**
 * Wraps a synchronous Standard Schema as a {@link YamlValidate}, the way the docs show it.
 */
function validateWith<T>(schema: z.ZodType<T>): YamlValidate<T> {
	return (value) => {
		const result = schema['~standard'].validate(value);
		if (result instanceof Promise) {
			throw new TypeError('Async schemas are not supported');
		}
		return result.issues ? { success: false, issues: result.issues } : { success: true, data: result.value as T };
	};
}

const siteSchema = z.object({
	title: z.string(),
	port: z.number(),
	tags: z.array(z.string()),
});

const accept: YamlValidate<unknown> = (value) => ({ success: true, data: value });

function catchError(run: () => unknown): YamlDocumentError {
	try {
		run();
	} catch (error) {
		expect(error).toBeInstanceOf(YamlDocumentError);
		return error as YamlDocumentError;
	}
	throw new Error('Expected a YamlDocumentError');
}

describe('validation issues', () => {
	test('any Standard Schema validator: the issue names the line and the schema path', () => {
		const text = ['title: Docs', 'tags: [a, b]', 'port: eighty', ''].join('\n');

		const error = catchError(() => parseYaml(text, validateWith(siteSchema), { filename: 'site.yaml' }));

		expect(error.issues).toHaveLength(1);
		expect(error.issues[0]).toMatchObject({
			filename: 'site.yaml',
			line: 3,
			column: 7,
			path: ['port'],
		});
		expect(error.issues[0]?.message).toContain('number');
		expect(error.message).toMatch(/^site\.yaml:3:7 port: /);
	});

	test('a nested path points at the value, with array indexes as numbers', () => {
		const text = ['title: Docs', 'port: 80', 'tags:', '  - a', '  - 2', ''].join('\n');

		const result = safeParseYaml(text, validateWith(siteSchema));

		expect(result).toMatchObject({
			success: false,
			issues: [{ path: ['tags', 1], line: 5, column: 5 }],
		});
	});

	test('a missing key points at the nearest ancestor that exists', () => {
		const text = ['site:', '  title: Docs', '  port: 80', ''].join('\n');
		const schema = z.object({ site: z.object({ title: z.string(), port: z.number(), tags: z.array(z.string()) }) });

		const result = safeParseYaml(text, validateWith(schema));

		expect(result).toMatchObject({
			success: false,
			issues: [{ path: ['site', 'tags'], line: 2, column: 3 }],
		});
	});

	test('an issue about the whole document points at the start of the document', () => {
		const result = safeParseYaml('- a\n- b\n', validateWith(siteSchema));

		expect(result).toMatchObject({ success: false, issues: [{ path: [], line: 1, column: 1 }] });
	});

	test('an empty document is validated as null and points at line 1', () => {
		const result = safeParseYaml('', validateWith(siteSchema));

		expect(result).toMatchObject({ success: false, issues: [{ line: 1, column: 1 }] });
	});

	test('path segments given as { key } are accepted', () => {
		const result = safeParseYaml(['a:', '  b:', '    - x', '    - y', ''].join('\n'), () => ({
			success: false,
			issues: [{ message: 'bad', path: [{ key: 'a' }, 'b', { key: 1 }] }],
		}));

		expect(result).toEqual({
			success: false,
			issues: [{ message: 'bad', path: ['a', 'b', 1], line: 4, column: 7 }],
		});
	});

	test('every issue is reported, each with its own position', () => {
		const result = safeParseYaml('a: 1\nb: 2\n', () => ({
			success: false,
			issues: [
				{ message: 'first', path: ['a'] },
				{ message: 'second', path: ['b'] },
			],
		}));

		expect(result).toMatchObject({
			success: false,
			issues: [
				{ message: 'first', line: 1, column: 4 },
				{ message: 'second', line: 2, column: 4 },
			],
		});
	});

	test('filename is omitted from issues when not given', () => {
		const result = safeParseYaml('a: 1\n', () => ({ success: false, issues: [{ message: 'no', path: ['a'] }] }));

		expect(result).toEqual({ success: false, issues: [{ message: 'no', path: ['a'], line: 1, column: 4 }] });
	});

	test('the validated data is returned as the validator produced it', () => {
		const data = parseYaml('title: Docs\nport: 80\ntags: []\n', validateWith(siteSchema));

		expect(data).toEqual({ title: 'Docs', port: 80, tags: [] });
	});
});

describe('syntax errors', () => {
	const badIndent = ['title: Docs', 'site:', '  a: 1', '  b: 2', ' c: 3', 'tags: []', ''].join('\n');

	test('point at the line and do not call validate', () => {
		const validate = vi.fn(accept);

		const error = catchError(() => parseYaml(badIndent, validate, { filename: 'bad.yaml' }));

		expect(validate).not.toHaveBeenCalled();
		expect(error.issues.length).toBeGreaterThan(0);
		expect(error.issues[0]).toMatchObject({ filename: 'bad.yaml', line: 5, column: 1, path: [] });
		expect(error.issues[0]?.message).not.toMatch(/at line \d+/);
		expect(error.issues[0]?.message).not.toContain('\n');
	});

	test('an over-indented line is reported once, on that line', () => {
		const text = ['title: Docs', 'site:', '  a: 1', '  b: 2', '  e: 2', '   f: 3', 'tags: []', ''].join('\n');
		const validate = vi.fn(accept);

		const result = safeParseYaml(text, validate);

		expect(validate).not.toHaveBeenCalled();
		expect(result).toMatchObject({ success: false, issues: [{ line: 6, path: [] }] });
		if (result.success) {
			return;
		}
		expect(result.issues).toHaveLength(1);
		expect(result.issues[0]?.message).toMatch(/^Bad indentation/);
	});

	test('a second document is reported in terms of the file, not the parser API', () => {
		const validate = vi.fn(accept);

		const result = safeParseYaml('a: 1\n---\nb: 2\n', validate);

		expect(result).toEqual({
			success: false,
			issues: [{ message: 'A file holds one document; remove the extra `---`.', path: [], line: 2, column: 1 }],
		});
		expect(validate).not.toHaveBeenCalled();
	});

	test.each([
		['!!js/function "f(){}"', '!!js/function'],
		['!foo bar', '!foo'],
		['!!float 1', '!!float'],
		['!!binary aGVsbG8=', '!!binary'],
		['!!set { x, y }', '!!set'],
		['!!timestamp 2001-12-14', '!!timestamp'],
		['!!omap [ { x: 1 } ]', '!!omap'],
		['!!pairs [ { x: 1 } ]', '!!pairs'],
	])('the tag %s is an issue at the tag, and validate is not called', (value, tag) => {
		const validate = vi.fn(accept);

		const result = safeParseYaml(`a: 1\nb: ${value}\n`, validate);

		expect(validate).not.toHaveBeenCalled();
		expect(result).toMatchObject({ success: false, issues: [{ path: [], line: 2, column: 4 }] });
		if (result.success) {
			return;
		}
		expect(result.issues[0]?.message).toContain(`remove ${tag} `);
	});

	test('the explicit core tags !!str and !!int still work', () => {
		expect(parseYaml('a: !!str 5\nb: !!int "3"\n', accept)).toEqual({ a: '5', b: 3 });
	});

	test('an alias bomb is reported, not thrown, and validate is not called', () => {
		const lines = ['a0: &a0 [x, x, x, x, x, x, x, x, x, x]'];
		for (let level = 1; level <= 5; level++) {
			const previous = `*a${level - 1}`;
			lines.push(`a${level}: &a${level} [${Array(10).fill(previous).join(', ')}]`);
		}
		const validate = vi.fn(accept);

		const result = safeParseYaml(lines.join('\n'), validate);

		expect(result).toMatchObject({ success: false, issues: [{ path: [], line: 1, column: 1 }] });
		if (!result.success) {
			expect(result.issues[0]?.message).toMatch(/more than 100 times/);
			expect(result.issues[0]?.message).not.toMatch(/resource exhaustion/);
		}
		expect(validate).not.toHaveBeenCalled();
	});

	test('duplicate keys are a syntax error', () => {
		const result = safeParseYaml('a: 1\na: 2\n', accept);

		expect(result).toMatchObject({ success: false, issues: [{ line: 2, column: 1 }] });
	});
});

describe('anchors, merge keys, keys and byte order marks', () => {
	const mergeSchema = z.object({
		defaults: z.object({ port: z.number(), title: z.string() }),
		servers: z.array(z.object({ port: z.number(), title: z.string(), name: z.string() })),
	});

	test('merge keys fill a map from an anchor', () => {
		const text = [
			'defaults: &defaults',
			'  port: 80',
			'  title: Docs',
			'servers:',
			'  - <<: *defaults',
			'    name: a',
			'',
		].join('\n');

		expect(parseYaml(text, validateWith(mergeSchema))).toEqual({
			defaults: { port: 80, title: 'Docs' },
			servers: [{ port: 80, title: 'Docs', name: 'a' }],
		});
	});

	test('an issue inside a merged value points at the map that merges it', () => {
		const text = [
			'defaults: &defaults',
			'  port: 80',
			'  title: Docs',
			'servers:',
			'  - <<: *defaults',
			'    port: eighty',
			'    name: a',
			'  - <<: *defaults',
			'    port: 81',
			'',
		].join('\n');

		const result = safeParseYaml(text, validateWith(mergeSchema));

		expect(result).toMatchObject({
			success: false,
			issues: [
				{ path: ['servers', 0, 'port'], line: 6, column: 11 },
				{ path: ['servers', 1, 'name'], line: 8, column: 5 },
			],
		});
	});

	test('a merged value that is invalid points at the merging map, not at line 1', () => {
		const text = [
			'defaults: &defaults',
			'  port: eighty',
			'  title: Docs',
			'servers:',
			'  - <<: *defaults',
			'    name: a',
			'',
		].join('\n');

		const result = safeParseYaml(text, validateWith(mergeSchema));

		expect(result).toMatchObject({
			success: false,
			issues: expect.arrayContaining([
				expect.objectContaining({ path: ['defaults', 'port'], line: 2, column: 9 }),
			]),
		});
		if (result.success) {
			return;
		}
		expect(result.issues.find((found) => found.path.join('.') === 'servers.0.port')).toMatchObject({
			line: 5,
			column: 5,
		});
	});

	test('numeric keys are read as strings and found by their string path', () => {
		const text = ['1: one', '2: two', ''].join('\n');

		expect(parseYaml(text, accept)).toEqual({ '1': 'one', '2': 'two' });
		expect(
			safeParseYaml(text, () => ({ success: false, issues: [{ message: 'bad', path: ['2'] }] })),
		).toMatchObject({ success: false, issues: [{ line: 2, column: 4 }] });
	});

	test('a leading byte order mark does not shift the first line', () => {
		const result = safeParseYaml('\uFEFFport: eighty\n', validateWith(siteSchema));

		expect(result).toMatchObject({
			success: false,
			issues: expect.arrayContaining([expect.objectContaining({ path: ['port'], line: 1, column: 7 })]),
		});
	});
});

describe('YAML 1.2 core schema', () => {
	test('no, yes, on and off stay strings', () => {
		const value = parseYaml(
			['label: no', 'options:', '  - value: on', '  - value: off', '  - value: yes', 'flag: true', ''].join('\n'),
			accept,
		);

		expect(value).toEqual({
			label: 'no',
			options: [{ value: 'on' }, { value: 'off' }, { value: 'yes' }],
			flag: true,
		});
	});

	test('an unquoted 1.10 is a number; only quoting keeps the string', () => {
		expect(parseYaml('unquoted: 1.10\nquoted: "1.10"\n', accept)).toEqual({ unquoted: 1.1, quoted: '1.10' });
	});
});

describe('safeParseYaml', () => {
	test('reports instead of throwing, with every issue line and column', () => {
		const result = safeParseYaml('title: 1\nport: x\ntags: nope\n', validateWith(siteSchema), {
			filename: 'site.yaml',
		});

		expect(result.success).toBe(false);
		if (result.success) {
			return;
		}
		expect(result.issues.map((issue) => [issue.line, issue.column, issue.filename])).toEqual([
			[1, 8, 'site.yaml'],
			[2, 7, 'site.yaml'],
			[3, 7, 'site.yaml'],
		]);
	});

	test('returns the data on success', () => {
		expect(safeParseYaml('a: 1\n', accept)).toEqual({ success: true, data: { a: 1 } });
	});
});

describe('YamlDocumentError', () => {
	test('lists each issue on its own line and keeps them on issues', () => {
		const error = catchError(() =>
			parseYaml('a: 1\nb: 2\n', () => ({
				success: false,
				issues: [
					{ message: 'first', path: ['a'] },
					{ message: 'second', path: [] },
				],
			})),
		);

		expect(error.name).toBe('YamlDocumentError');
		expect(error.message).toBe('line 1, column 4 a: first\nline 1, column 1 second');
		expect(error.issues).toHaveLength(2);
	});
});

import type { StandardSchemaV1 } from '@standard-schema/spec';
import { describe, expect, expectTypeOf, it } from 'vitest';
import * as z from 'zod/mini';
import { isStandardSchema, safeParseStandardSchema, standardSchema } from '../src';

describe('isStandardSchema', () => {
	it('accepts a schema library schema and a standardSchema', () => {
		expect(isStandardSchema(z.string())).toBe(true);
		expect(isStandardSchema(standardSchema((value) => ({ value })))).toBe(true);
	});

	it('accepts a function that carries a ~standard property', () => {
		const callable = Object.assign(() => undefined, {
			'~standard': { version: 1, vendor: 'x', validate: () => ({ value: 1 }) },
		});

		expect(isStandardSchema(callable)).toBe(true);
	});

	it.each([
		['null', null],
		['undefined', undefined],
		['a string', 'schema'],
		['an object without ~standard', {}],
		['a parse-only object', { parse: () => ({}) }],
		['a ~standard without validate', { '~standard': { version: 1, vendor: 'x' } }],
	])('rejects %s', (_label, value) => {
		expect(isStandardSchema(value)).toBe(false);
	});

	it('narrows the type of an unknown value', () => {
		const value: unknown = z.string();

		if (isStandardSchema(value)) expectTypeOf(value).toEqualTypeOf<StandardSchemaV1>();
	});
});

describe('standardSchema', () => {
	it('types the input it accepts when asked to, and leaves it unknown otherwise', () => {
		const withInput = standardSchema<{ gap: string }, { gap?: string }>((value) => ({
			value: { gap: (value as { gap?: string }).gap ?? 'sm' },
		}));
		const withoutInput = standardSchema<number>((value) => ({ value: Number(value) }));

		expectTypeOf<StandardSchemaV1.InferInput<typeof withInput>>().toEqualTypeOf<{ gap?: string }>();
		expectTypeOf<StandardSchemaV1.InferOutput<typeof withInput>>().toEqualTypeOf<{ gap: string }>();
		expectTypeOf<StandardSchemaV1.InferInput<typeof withoutInput>>().toEqualTypeOf<unknown>();
		expect(safeParseStandardSchema(withInput, {})).toEqual({ success: true, data: { gap: 'sm' } });
	});

	it('is a Standard Schema that runs the function', () => {
		const positive = standardSchema((value) =>
			typeof value === 'number' && value > 0
				? { value }
				: { issues: [{ message: 'Expected a positive number.' }] },
		);

		expect(safeParseStandardSchema(positive, 2)).toEqual({ success: true, data: 2 });
		expect(safeParseStandardSchema(positive, -1)).toEqual({
			success: false,
			error: { issues: [{ message: 'Expected a positive number.' }] },
		});
	});
});

describe('safeParseStandardSchema', () => {
	it('returns the parsed value of a schema that accepts the input', () => {
		const schema = z.object({ count: z._default(z.number(), 1) });

		expect(safeParseStandardSchema(schema, {})).toEqual({ success: true, data: { count: 1 } });
	});

	it('returns the issues of a schema that refuses the input, with their paths', () => {
		const input: { count: number } = JSON.parse('{ "count": "x" }');
		const result = safeParseStandardSchema(z.object({ count: z.number() }), input);

		expect(result.success).toBe(false);
		if (result.success) return;
		expect(result.error.issues.map((issue) => issue.path)).toEqual([['count']]);
	});

	it('throws for a schema that validates asynchronously', () => {
		const asyncSchema = {
			'~standard': { version: 1, vendor: 'test', validate: async () => ({ value: 1 }) },
		} as const;

		expect(() => safeParseStandardSchema(asyncSchema, 1)).toThrow('Async Standard Schema validation');
	});
});

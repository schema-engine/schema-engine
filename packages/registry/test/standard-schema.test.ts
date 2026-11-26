import { describe, expect, it } from 'vitest';
import * as z from 'zod/mini';
import { safeParseStandardSchema, standardSchema } from '../src';

describe('standardSchema', () => {
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

import { describe, expect, it } from 'vitest';
import * as z from 'zod/mini';
import { safeParseStandardSchema } from '../src';

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

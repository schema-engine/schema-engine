import { describe, expect, test } from 'vitest';
import * as z from 'zod/mini';
import { withExportedRules } from '@/lib/exported-rules';

const rule = z.object({ type: z.literal('only') });

describe('typing the rules of an element schema for export', () => {
	test('replaces the items of rules, and leaves a schema without rules as it is', () => {
		const typed = withExportedRules(
			z.object({ rules: z.optional(z.array(z.looseObject({ type: z.string() }))) }),
			rule,
		);

		expect(z.toJSONSchema(typed).properties).toMatchObject({
			rules: { items: { properties: { type: { const: 'only' } } } },
		});
		const bare = z.object({ name: z.string() });
		expect(withExportedRules(bare, rule)).toBe(bare);
	});

	test('keeps the description registered for an object and for a pipe', () => {
		const object = z.object({ rules: z.optional(z.array(z.looseObject({ type: z.string() }))) });
		z.globalRegistry.add(object, { description: 'The element' });
		const piped = z.pipe(
			object,
			z.transform((value) => value),
		);
		z.globalRegistry.add(piped, { description: 'The piped element' });

		expect(z.globalRegistry.get(withExportedRules(object, rule))?.description).toBe('The element');
		expect(z.globalRegistry.get(withExportedRules(piped, rule))?.description).toBe('The piped element');
	});
});

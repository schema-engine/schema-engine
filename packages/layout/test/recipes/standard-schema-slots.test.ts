import type { StandardSchemaV1 } from '@standard-schema/spec';
import { standardSchema } from '@schema-engine/registry';
import { describe, expect, test } from 'vitest';
import * as v from 'valibot';
import { getDefaultLayoutTheme } from '@/lib/layout-theme';
import { bindRecipe } from '@/recipes/bind-recipe';
import { defineProtocolRecipeSpec } from '@/recipes/define-recipe-spec';
import { createRecipeRegistry, defineRecipeProtocol } from '@/recipes/protocol';
import { resolveRecipeView } from '@/recipes/resolve-recipe-view';

const cardProtocol = defineRecipeProtocol({ slots: ['header', 'body', 'footer'], kinds: ['card'] });
const scope = { axes: getDefaultLayoutTheme().axes, inherited: {} };
const metadata = { name: 'Card' };

/** The issue paths of a result as plain keys, whichever library built the segments. */
function issuePaths(result: unknown): PropertyKey[][] {
	const { issues = [] } = result as { issues?: readonly StandardSchemaV1.Issue[] };
	return issues.map((issue) =>
		(issue.path ?? []).map((segment) => (typeof segment === 'object' ? segment.key : segment)),
	);
}

interface BodyInput {
	gap?: 'sm' | 'md';
	appearance?: Record<string, string>;
}

/** A body slot built by hand, with no schema library. */
const handWrittenBody = standardSchema<{ gap: 'sm' | 'md'; appearance?: Record<string, string> }, BodyInput>(
	(value) => {
		const input = (value ?? {}) as BodyInput;
		if (input.gap !== undefined && input.gap !== 'sm' && input.gap !== 'md') {
			return { issues: [{ message: 'gap must be sm or md', path: ['gap'] }] };
		}
		return { value: { gap: input.gap ?? 'sm' } };
	},
);

const valibotBody = v.strictObject({
	gap: v.optional(v.picklist(['sm', 'md']), 'sm'),
	appearance: v.optional(v.record(v.string(), v.string())),
});

describe('recipe slot schemas from any Standard Schema library', () => {
	test('resolves a hand-written Standard Schema slot end to end, with its default and an issue at the unknown slot', () => {
		const card = bindRecipe(
			defineProtocolRecipeSpec(cardProtocol, {
				$type: 'card',
				kind: 'card',
				metadata,
				slotSchemas: {
					header: v.object({ title: v.optional(v.string()) }),
					body: handWrittenBody,
					footer: v.object({}),
				},
				slotDefaults: { body: { gap: 'md' } },
			}),
			null,
		);

		const resolved = resolveRecipeView(card, { $type: 'card' }, scope);
		expect(resolved.issues).toEqual([]);
		expect(resolved.view).toEqual({ $type: 'card', header: {}, body: { gap: 'md' }, footer: {} });

		const unknown = resolveRecipeView(card, { $type: 'card', aside: {} }, scope);
		expect(unknown.view).toBeUndefined();
		expect(unknown.schemaIssues).toHaveLength(1);
		expect(unknown.schemaIssues?.[0]).toMatchObject({ path: ['aside'] });
		expect(unknown.schemaIssues?.[0]?.message).toBe(
			`Recipe 'card' does not accept view key 'aside'. Allowed: header, body, footer.`,
		);
	});

	test('reports a Valibot slot issue at the slot and the key', () => {
		const card = bindRecipe(
			defineProtocolRecipeSpec(cardProtocol, {
				$type: 'card',
				kind: 'card',
				metadata,
				slotSchemas: { body: valibotBody },
			}),
			null,
		);

		const resolved = resolveRecipeView(card, { $type: 'card', body: { gap: 'xl' } }, scope);
		expect(resolved.view).toBeUndefined();
		expect(resolved.schemaIssues).toHaveLength(1);
		expect(issuePaths({ issues: resolved.schemaIssues ?? [] })).toEqual([['body', 'gap']]);
	});

	test('reports a view that is not an object, a wrong $type and every slot problem together', () => {
		const spec = defineProtocolRecipeSpec(cardProtocol, {
			$type: 'card',
			kind: 'card',
			metadata,
			slotSchemas: { header: v.strictObject({ level: v.number() }), body: valibotBody },
		});
		const schema: StandardSchemaV1 = spec.schema;

		expect(schema['~standard'].validate('nope')).toEqual({
			issues: [{ message: 'Expected a view object.', path: [] }],
		});

		const result = schema['~standard'].validate({ $type: 'other', header: { level: 'x' }, body: { gap: 'xl' } });
		expect(issuePaths(result)).toEqual([['$type'], ['header', 'level'], ['body', 'gap']]);
	});

	test('treats an omitted slot as {} and keeps null as the author gave it', () => {
		const spec = defineProtocolRecipeSpec(cardProtocol, {
			$type: 'card',
			kind: 'card',
			metadata,
			slotSchemas: { body: valibotBody },
		});
		const schema: StandardSchemaV1 = spec.schema;
		expect(schema['~standard'].validate({ $type: 'card' })).toEqual({
			value: { $type: 'card', body: { gap: 'sm' } },
		});
		expect(schema['~standard'].validate({ $type: 'card', body: null })).toMatchObject({
			issues: [{ path: ['body'] }],
		});
	});

	test('fails a spec whose slot default is invalid for a Valibot slot', () => {
		expect(() =>
			defineProtocolRecipeSpec(cardProtocol, {
				$type: 'card',
				kind: 'card',
				metadata,
				slotSchemas: { body: valibotBody },
				// @ts-expect-error -- gap is a picklist of text, not a number
				slotDefaults: { body: { gap: 3 } },
			}),
		).toThrow(/Recipe 'card' slotDefaults\.body is invalid: gap: /);
	});

	test('names an unknown key in a slot default, whichever library reports it', () => {
		const define = (body: StandardSchemaV1) => () =>
			defineProtocolRecipeSpec(cardProtocol, {
				$type: 'card',
				kind: 'card',
				metadata,
				slotSchemas: { body },
				slotDefaults: { body: { gapp: 'md' } },
			});
		expect(define(valibotBody)).toThrow(/Recipe 'card' slotDefaults\.body is invalid: gapp: /);
		const keysIssue = { message: 'Unknown keys', path: [], keys: ['gapp'] };
		const reportsKeys = standardSchema(() => ({ issues: [keysIssue] }));
		expect(define(reportsKeys)).toThrow("Recipe 'card' slotDefaults.body is invalid: gapp: Unknown keys");
	});

	test('refuses an async slot schema where a view is resolved', () => {
		const asyncBody: StandardSchemaV1 = {
			'~standard': { version: 1, vendor: 'test', validate: () => Promise.resolve({ value: {} }) },
		};
		const card = bindRecipe(
			defineProtocolRecipeSpec(cardProtocol, {
				$type: 'card',
				kind: 'card',
				metadata,
				slotSchemas: { body: asyncBody },
			}),
			null,
		);
		expect(() => resolveRecipeView(card, { $type: 'card' }, scope)).toThrow(
			'Async Standard Schema validation is not supported in this context',
		);
	});

	test('keeps the slot schemas on the registration it binds', () => {
		const spec = defineProtocolRecipeSpec(cardProtocol, {
			$type: 'card',
			kind: 'card',
			metadata,
			slotSchemas: { body: valibotBody },
		});
		expect(bindRecipe(spec, null).slotSchemas).toBe(spec.slotSchemas);
	});
});

describe('createRecipeRegistry slotSchemas', () => {
	const spec = defineProtocolRecipeSpec(cardProtocol, {
		$type: 'card',
		kind: 'card',
		metadata,
		slotSchemas: { body: valibotBody },
	});
	const card = bindRecipe(spec, null);

	test('accepts the registration a spec binds and one without slotSchemas', () => {
		const { slotSchemas: _omitted, ...handWritten } = card;
		expect(() => createRecipeRegistry(cardProtocol, [card])).not.toThrow();
		expect(() => createRecipeRegistry(cardProtocol, [handWritten])).not.toThrow();
	});

	test('rejects a slot schema for a slot the recipe does not list, naming the recipe', () => {
		const extra = { ...card, slotSchemas: { body: valibotBody, footer: valibotBody } };
		expect(() => createRecipeRegistry(cardProtocol, [extra])).toThrow(
			/Recipe 'card' slotSchemas must list exactly the recipe's slots \(body\): 'footer' is not a declared slot/,
		);
	});

	test('rejects a listed slot without a schema', () => {
		const missing = { ...card, slotSchemas: {} };
		expect(() => createRecipeRegistry(cardProtocol, [missing])).toThrow(
			/Recipe 'card' slotSchemas .*'body' has no schema/,
		);
	});

	test('rejects a slot schema that is not a Standard Schema', () => {
		const broken = { ...card, slotSchemas: { body: { parse: () => ({}) } as unknown as StandardSchemaV1 } };
		expect(() => createRecipeRegistry(cardProtocol, [broken])).toThrow(
			/Recipe 'card' slotSchemas\.body must implement Standard Schema/,
		);
	});
});

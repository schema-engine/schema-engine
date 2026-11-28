import { describe, expect, test } from 'vitest';
import type { StandardSchemaV1 } from '@standard-schema/spec';
import { safeParseStandardSchema } from '@schema-engine/registry';
import { bindRecipe } from '@/recipes/bind-recipe';
import { defineRecipeProtocol, createRecipeRegistry } from '@/recipes/protocol';
import { defineProtocolRecipeSpec } from '@/recipes/define-recipe-spec';
import { readSlotConfig } from '@/recipes/view-model';
import { mergeSlotDefaults } from '@/recipes/merge-slot-defaults';
import { ContentConfigSchema, MediaConfigSchema, ShellConfigSchema, sectionProtocol } from './section-protocol';

const metadata = { name: 'Hero' };

describe('defineRecipeProtocol', () => {
	test('is frozen and copied, so a domain cannot change its vocabulary after declaring it', () => {
		const slots = ['a', 'b'];
		const protocol = defineRecipeProtocol({ slots, kinds: ['k'] });
		slots.push('c');
		expect(protocol.slots).toEqual(['a', 'b']);
		for (const frozen of [protocol, protocol.slots, protocol.kinds, protocol.rules]) {
			expect(Object.isFrozen(frozen)).toBe(true);
		}
	});

	test.each([
		['no slots', { slots: [], kinds: ['a'] }, /at least one slot/],
		['no kinds', { slots: ['a'], kinds: [] }, /at least one kind/],
		['a repeated slot', { slots: ['a', 'a'], kinds: ['k'] }, /slot 'a' is declared twice/],
		['a repeated kind', { slots: ['a'], kinds: ['k', 'k'] }, /kind 'k' is declared twice/],
	])('rejects %s', (_label, definition, message) => {
		expect(() => defineRecipeProtocol(definition)).toThrow(message);
	});
});

describe('defineProtocolRecipeSpec against a protocol', () => {
	test('lists the declared slots in protocol order, whatever order the schemas were written in', () => {
		const spec = defineProtocolRecipeSpec(sectionProtocol, {
			$type: 'hero',
			kind: 'section',
			metadata,
			slotSchemas: { content: ContentConfigSchema, shell: ShellConfigSchema },
		});
		expect(spec.slots).toEqual(['shell', 'content']);
		expect(spec.kind).toBe('section');
	});

	test('builds a strict view schema that fills each declared slot', () => {
		const spec = defineProtocolRecipeSpec(sectionProtocol, {
			$type: 'hero',
			kind: 'section',
			metadata,
			slotSchemas: { content: ContentConfigSchema },
		});
		const schema: StandardSchemaV1 = spec.schema;
		expect(safeParseStandardSchema(schema, { $type: 'hero' })).toEqual({
			success: true,
			data: { $type: 'hero', content: {} },
		});
		expect(safeParseStandardSchema(schema, { $type: 'hero', media: {} }).success).toBe(false);
	});

	test('runs the protocol rules, naming the recipe and the rule', () => {
		expect(() =>
			defineProtocolRecipeSpec(sectionProtocol, {
				$type: 'bare-hero',
				kind: 'section',
				metadata,
				slotSchemas: { media: MediaConfigSchema },
			}),
		).toThrow(/Recipe 'bare-hero'.*'section-needs-content'/);
	});

	test('rejects a slot the protocol does not declare', () => {
		expect(() =>
			defineProtocolRecipeSpec(sectionProtocol, {
				$type: 'odd',
				kind: 'section',
				metadata,
				slotSchemas: { content: ContentConfigSchema, aside: ContentConfigSchema } as never,
			}),
		).toThrow(/Recipe 'odd' declares slot 'aside', which the protocol does not declare/);
	});

	test('rejects a kind the protocol does not declare', () => {
		expect(() =>
			defineProtocolRecipeSpec(sectionProtocol, {
				$type: 'odd',
				kind: 'wizard' as never,
				metadata,
				slotSchemas: { content: ContentConfigSchema },
			}),
		).toThrow(/Recipe 'odd' has kind 'wizard', which the protocol does not declare/);
	});

	test('validates slot defaults against the slot schema', () => {
		expect(() =>
			defineProtocolRecipeSpec(sectionProtocol, {
				$type: 'hero',
				kind: 'section',
				metadata,
				slotSchemas: { content: ContentConfigSchema },
				slotDefaults: { content: { columns: 'two' } as never },
			}),
		).toThrow(/Recipe 'hero' slotDefaults.content is invalid/);
	});

	test('rejects slot defaults for a slot the recipe does not declare', () => {
		expect(() =>
			defineProtocolRecipeSpec(sectionProtocol, {
				$type: 'hero',
				kind: 'section',
				metadata,
				slotSchemas: { content: ContentConfigSchema },
				slotDefaults: { media: {} } as never,
			}),
		).toThrow(/slotDefaults.media: the recipe does not declare a 'media' slot/);
	});

	test('requires a slot that declares appearance axes to be a declared slot', () => {
		expect(() =>
			defineProtocolRecipeSpec(sectionProtocol, {
				$type: 'hero',
				kind: 'section',
				metadata,
				slotSchemas: { content: ContentConfigSchema },
				appearanceAxes: { media: ['size'] } as never,
			}),
		).toThrow(/appearanceAxes.media: the recipe does not declare a 'media' slot/);
	});
});

describe('createRecipeRegistry', () => {
	const valid = bindRecipe(
		defineProtocolRecipeSpec(sectionProtocol, {
			$type: 'hero',
			kind: 'section',
			metadata,
			slotSchemas: { content: ContentConfigSchema },
		}),
		null,
	);

	test('builds a read-only registry of valid recipes', () => {
		const registry = createRecipeRegistry(sectionProtocol, [valid]);
		expect(registry.kind).toBe('Recipe');
		expect(registry.get('hero')?.kind).toBe('section');
		expect(registry).not.toHaveProperty('register');
		expect(registry).not.toHaveProperty('clear');
	});

	test('runs the protocol rules at build, naming the recipe and the rule', () => {
		const withoutContent = { ...valid, $type: 'bare-hero', slots: ['media' as const] };
		expect(() => createRecipeRegistry(sectionProtocol, [withoutContent])).toThrow(
			expect.objectContaining({
				code: 'invalid-declaration',
				kind: 'Recipe',
				$type: 'bare-hero',
				message: expect.stringMatching(
					/Recipe 'bare-hero' breaks rule 'section-needs-content': kind 'section' must declare a content slot/,
				),
			}),
		);
	});

	test('checks only the winning registration of a $type', () => {
		const { slotSchemas: _slotSchemas, ...handWritten } = valid;
		const withoutContent = { ...handWritten, slots: ['media' as const] };
		expect(() => createRecipeRegistry(sectionProtocol, [withoutContent, valid])).not.toThrow();
		expect(() => createRecipeRegistry(sectionProtocol, [valid, withoutContent])).toThrow(/section-needs-content/);
	});

	test('rejects a hand-written recipe with a kind or slot outside the protocol', () => {
		expect(() => createRecipeRegistry(sectionProtocol, [{ ...valid, kind: 'wizard' as never }])).toThrow(
			expect.objectContaining({
				code: 'invalid-declaration',
				kind: 'Recipe',
				$type: 'hero',
				message: expect.stringContaining("kind 'wizard', which the protocol does not declare"),
			}),
		);
		expect(() =>
			createRecipeRegistry(sectionProtocol, [{ ...valid, slots: ['content', 'aside'] as never }]),
		).toThrow(
			expect.objectContaining({
				code: 'invalid-declaration',
				kind: 'Recipe',
				$type: 'hero',
				message: expect.stringContaining("slot 'aside', which the protocol does not declare"),
			}),
		);
	});

	test('checks the kind and slots against the protocol before any rule sees the recipe', () => {
		const seen: string[] = [];
		const recording = defineRecipeProtocol({
			slots: ['content'],
			kinds: ['section'],
			rules: [{ name: 'records', check: (recipe) => void seen.push(recipe.kind, ...recipe.slots) }],
		});
		const odd = { ...valid, kind: 'wizard' as never, slots: ['aside'] as never };
		expect(() => createRecipeRegistry(recording, [odd])).toThrow(/does not declare/);
		expect(seen).toEqual([]);
	});

	test('rejects a registration whose schema is not a Standard Schema', () => {
		expect(() => createRecipeRegistry(sectionProtocol, [{ ...valid, schema: {} as never }])).toThrow(
			expect.objectContaining({
				code: 'invalid-schema',
				kind: 'Recipe',
				$type: 'hero',
				message: expect.stringContaining('Standard Schema'),
			}),
		);
	});

	test('applies the rules of the protocol it was given, not another domain', () => {
		const lenient = defineRecipeProtocol({ slots: ['shell', 'media', 'content'], kinds: ['section'] });
		const { slotSchemas: _slotSchemas, ...handWritten } = valid;
		const withoutContent = { ...handWritten, slots: ['media' as const] };
		expect(() => createRecipeRegistry(lenient, [withoutContent])).not.toThrow();
	});
});

describe('bindRecipe', () => {
	test('copies the spec fields and attaches the render payload', () => {
		const spec = defineProtocolRecipeSpec(sectionProtocol, {
			$type: 'hero',
			kind: 'section',
			metadata,
			slotSchemas: { content: ContentConfigSchema },
			slotDefaults: { content: { columns: 2 } },
			appearanceAxes: { content: ['size'] },
		});
		const render = { shell: null };
		const registration = bindRecipe(spec, render);
		expect(registration).toMatchObject({
			$type: 'hero',
			kind: 'section',
			slots: ['content'],
			schema: spec.schema,
			metadata,
			slotDefaults: { content: { columns: 2 } },
			appearanceAxes: { content: ['size'] },
		});
		expect(registration.render).toBe(render);
	});
});

describe('mergeSlotDefaults', () => {
	test('lays the author over the defaults, deep for plain objects', () => {
		expect(
			mergeSlotDefaults(
				{ content: { nested: { b: 2 }, list: [3] } },
				{ content: { nested: { a: 1, b: 1 }, list: [1, 2] } },
			),
		).toEqual({ content: { nested: { a: 1, b: 2 }, list: [3] } });
	});

	test('keeps the default for a key the author sets to undefined, and returns the view when there are no defaults', () => {
		expect(mergeSlotDefaults({ content: { columns: undefined } }, { content: { columns: 2 } })).toEqual({
			content: { columns: 2 },
		});
		const view = { content: {} };
		expect(mergeSlotDefaults(view, undefined)).toBe(view);
	});

	test('leaves a slot without defaults alone, replaces defaults with a non-plain value, and does not mutate the view', () => {
		const view = { content: { list: [3] }, media: { ratio: '1:1' } };
		const merged = mergeSlotDefaults(view, { content: { list: [1, 2] }, shell: { maxWidth: 'lg' } });
		expect(merged).toEqual({ content: { list: [3] }, media: { ratio: '1:1' }, shell: { maxWidth: 'lg' } });
		expect(view).toEqual({ content: { list: [3] }, media: { ratio: '1:1' } });
		expect(mergeSlotDefaults({ content: null }, { content: { columns: 2 } })).toEqual({ content: null });
	});
});

describe('readSlotConfig', () => {
	test('reads a slot without parsing it again', () => {
		const viewConfig = { content: { columns: 2, extra: true } };
		expect(readSlotConfig(viewConfig, 'content', ContentConfigSchema)).toEqual({ columns: 2, extra: true });
	});
});

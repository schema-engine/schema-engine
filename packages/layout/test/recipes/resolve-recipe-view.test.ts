import { describe, expect, test } from 'vitest';
import * as z from 'zod/mini';
import { getDefaultLayoutTheme } from '@/lib/layout-theme';
import { bindRecipe } from '@/recipes/bind-recipe';
import { defineProtocolRecipeSpec } from '@/recipes/define-recipe-spec';
import { resolveRecipeView } from '@/recipes/resolve-recipe-view';
import { ContentConfigSchema, MediaConfigSchema, ShellConfigSchema, sectionProtocol } from './section-protocol';

const scope = (inherited: Record<string, string> = {}) => ({ axes: getDefaultLayoutTheme().axes, inherited });

const hero = bindRecipe(
	defineProtocolRecipeSpec(sectionProtocol, {
		$type: 'hero',
		kind: 'section',
		metadata: { name: 'Hero' },
		slotSchemas: { shell: ShellConfigSchema, media: MediaConfigSchema, content: ContentConfigSchema },
		slotDefaults: { content: { columns: 2 }, shell: { maxWidth: 'lg' } },
		appearanceAxes: { media: ['size', 'surface'], shell: ['surface'] },
	}),
	null,
);

describe('resolveRecipeView', () => {
	test('fills each declared slot from the recipe defaults, then the slot schema', () => {
		const resolved = resolveRecipeView(hero, { $type: 'hero', media: { ratio: '16:9' } }, scope());
		expect(resolved.issues).toEqual([]);
		expect(resolved.view).toEqual({
			$type: 'hero',
			shell: { maxWidth: 'lg' },
			media: { ratio: '16:9' },
			content: { columns: 2 },
		});
	});

	test('lets the author override a default', () => {
		const resolved = resolveRecipeView(hero, { $type: 'hero', content: { columns: 3 } }, scope());
		expect(resolved.view?.content).toEqual({ columns: 3 });
	});

	test('resolves slot appearance from the inherited picks and the slot own pick, for the axes the slot declares', () => {
		const resolved = resolveRecipeView(
			hero,
			{ $type: 'hero', media: { appearance: { surface: 'elevated' } } },
			scope({ size: 'compact', surface: 'flat' }),
		);
		expect(resolved.issues).toEqual([]);
		expect(resolved.view?.media).toEqual({ appearance: { size: 'compact', surface: 'elevated' } });
		expect(resolved.view?.shell).toEqual({ maxWidth: 'lg', appearance: { surface: 'flat' } });
		expect(resolved.view?.content).toEqual({ columns: 2 });
	});

	test('reports an invalid, unknown or unsupported slot appearance pick with the slot location', () => {
		const resolved = resolveRecipeView(
			hero,
			{
				$type: 'hero',
				media: { appearance: { size: 'huge' } },
				shell: { appearance: { size: 'compact' } },
			},
			scope(),
		);
		expect(resolved.issues).toEqual([
			{
				path: ['shell', 'appearance', 'size'],
				message: expect.stringContaining("Slot 'shell' of recipe 'hero' does not support the axis 'size'"),
			},
			{
				path: ['media', 'appearance', 'size'],
				message: expect.stringContaining("'huge' is not a value of 'size'"),
			},
		]);
	});

	test('returns the schema issues, with no view, when the parse fails', () => {
		const resolved = resolveRecipeView(hero, { $type: 'hero', content: { columns: 'many' } }, scope());
		expect(resolved.view).toBeUndefined();
		expect(resolved.schemaIssues?.length).toBeGreaterThan(0);
		expect(resolved.issues).toEqual([]);
	});

	test('rejects a slot key the strict view schema does not declare', () => {
		const resolved = resolveRecipeView(hero, { $type: 'hero', aside: {} }, scope());
		expect(resolved.view).toBeUndefined();
		expect(JSON.stringify(resolved.schemaIssues)).toContain('aside');
	});

	test('rejects an undeclared slot key a hand-written, non-strict schema lets through', () => {
		const lenient = { ...hero, $type: 'lenient', schema: z.looseObject({ $type: z.literal('lenient') }) };
		const resolved = resolveRecipeView(lenient, { $type: 'lenient', aside: {} }, scope());
		expect(resolved.issues).toEqual([
			{
				path: ['aside'],
				message: "Recipe 'lenient' does not accept view key 'aside'. Allowed: shell, media, content.",
			},
		]);
		expect(resolved.view).toBeDefined();
	});

	test('names a recipe with no slots in the rejection', () => {
		const bare = { ...hero, $type: 'bare', slots: [], schema: z.looseObject({ $type: z.literal('bare') }) };
		expect(resolveRecipeView(bare, { $type: 'bare', content: {} }, scope()).issues).toEqual([
			{ path: ['content'], message: "Recipe 'bare' does not accept view key 'content'. Allowed: (none)." },
		]);
	});

	test('reports a parsed output that lost its $type', () => {
		const stripped = { ...hero, $type: 'stripped', schema: z.object({}) };
		const resolved = resolveRecipeView(stripped, { $type: 'stripped' }, scope());
		expect(resolved.view).toBeUndefined();
		expect(resolved.issues).toEqual([
			{
				path: ['$type'],
				message: "Invalid view configuration for recipe 'stripped': parsed output is missing $type.",
			},
		]);
	});

	test('does not change the view it was given', () => {
		const view = { $type: 'hero', media: { appearance: { surface: 'elevated' } } };
		resolveRecipeView(hero, view, scope());
		expect(view).toEqual({ $type: 'hero', media: { appearance: { surface: 'elevated' } } });
	});

	test('refuses an async schema', () => {
		const asyncSchema = {
			'~standard': { version: 1, vendor: 'test', validate: async () => ({ value: {} }) },
		} as never;
		expect(() => resolveRecipeView({ ...hero, schema: asyncSchema }, { $type: 'hero' }, scope())).toThrow(/Async/);
	});
});

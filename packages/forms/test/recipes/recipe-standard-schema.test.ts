import * as v from 'valibot';
import { describe, expect, test } from 'vitest';
import * as z from 'zod/mini';
import { createFormEngine } from '@/engine/create-form-engine';
import { defineFormRecipe, defineRecipeSpec } from '@/recipes';

const ShellSchema = v.strictObject({
	accent: v.optional(v.pipe(v.string(), v.regex(/^#[0-9a-f]{3,6}$/i)), '#000000'),
	appearance: v.optional(v.record(v.string(), v.string())),
});

const brandSpec = defineRecipeSpec({
	$type: 'brand',
	kind: 'single-step',
	metadata: { name: 'Brand', description: 'A recipe whose shell slot is a Valibot schema' },
	slotSchemas: { shell: ShellSchema, header: z.object({ title: z.optional(z.string()) }) },
	slotDefaults: { header: { title: 'Welcome' } },
	appearanceAxes: { shell: ['size', 'surface'] },
});

const engine = createFormEngine({ recipes: [defineFormRecipe(brandSpec, {})] });

const form = (view: unknown) => ({ id: 'f', steps: [{ id: 'main', title: 'Main', elements: [] }], view });

describe('a recipe whose slot schemas come from different libraries', () => {
	test('validates a view and fills each slot from its own schema and the recipe defaults', () => {
		const result = engine.safeValidateForm(form({ $type: 'brand' }));
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.view).toMatchObject({
				$type: 'brand',
				shell: { accent: '#000000' },
				header: { title: 'Welcome' },
			});
		}
	});

	test('reports a Valibot slot issue under the form path of the view', () => {
		const result = engine.safeValidateForm(form({ $type: 'brand', shell: { accent: 'red' } }));
		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.issues.map((issue) => issue.path)).toEqual([['view', 'shell', 'accent']]);
		}
	});

	test('names the allowed slots for a slot the recipe does not declare', () => {
		const result = engine.safeValidateForm(form({ $type: 'brand', progress: {} }));
		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.issues).toMatchObject([
				{ path: ['view', 'progress'], message: expect.stringContaining('Allowed: shell, header') },
			]);
		}
	});

	test('writes the resolved appearance back on the slot', () => {
		const result = engine.safeValidateForm(
			form({ $type: 'brand', shell: { appearance: { size: 'compact', surface: 'outlined' } } }),
		);
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.view).toMatchObject({ shell: { appearance: { size: 'compact', surface: 'outlined' } } });
		}
	});

	test('rejects an appearance value outside the theme axes', () => {
		const result = engine.safeValidateForm(form({ $type: 'brand', shell: { appearance: { size: 'huge' } } }));
		expect(result.success).toBe(false);
	});
});

describe('the JSON Schema export of a recipe with a slot that is not Zod', () => {
	const { $defs } = engine.describeRecipe('brand').viewSchema as {
		$defs: Record<
			string,
			{ type: string; required: string[]; properties: Record<string, Record<string, unknown>> }
		>;
	};
	const viewSchema = $defs['recipe:brand']!;

	test('lists the Valibot slot as an open object with its appearance values', () => {
		const shell = viewSchema.properties.shell as {
			type: string;
			additionalProperties: unknown;
			properties: { appearance: { properties: Record<string, { enum: string[] }> } };
		};
		expect(shell.type).toBe('object');
		expect(shell.additionalProperties).toEqual({});
		const axes = shell.properties.appearance.properties;
		expect(Object.keys(axes).toSorted()).toEqual(['size', 'surface']);
		expect(axes.size?.enum).toEqual(['compact', 'default', 'comfortable']);
		expect(axes.surface?.enum).toEqual(['flat', 'outlined', 'elevated']);
	});

	test('exports a Zod slot of the same recipe in full', () => {
		const header = viewSchema.properties.header as { properties: Record<string, unknown> };
		expect(Object.keys(header.properties).toSorted()).toEqual(['appearance', 'title']);
	});

	test('requires only $type, since every slot is optional on input', () => {
		expect(viewSchema).toMatchObject({ type: 'object', required: ['$type'] });
	});

	test('lists the recipe in the view catalog and the collection', () => {
		expect(engine.describeViewCatalog().recipes.map((recipe) => recipe.$type)).toEqual(['brand']);
		expect(Object.keys(engine.generateJSONSchemaCollection().schemas ?? {})).toContain('recipe:brand');
	});
});

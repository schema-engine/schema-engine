import { describe, expect, test } from 'vitest';
import * as z from 'zod/mini';
import { builtInAxes, defineAxis } from '@schema-engine/layout';
import { createFormEngine } from '@/engine/create-form-engine';
import { BaseFieldSchema } from '@/schemas/base-field';
import { elementChildrenSchema } from '@/lib/element-children';
import { defineInput } from '@/types';
import { defineFormRecipe } from '@/recipes';
import { cardSpec, cardWizardSpec } from '@/recipes/built-in-specs';

const tone = defineAxis({
	$type: 'tone',
	metadata: { name: 'Tone' },
	default: 'neutral',
	values: { neutral: {}, brand: { '--se-tone-accent': '#f60' } },
});

const field = (
	$type: string,
	appearanceAxes?: string[],
	schema: z.ZodMiniType = z.extend(BaseFieldSchema, { $type: z.literal($type) }),
) =>
	defineInput({
		$type,
		schema,
		...(appearanceAxes ? { appearanceAxes } : {}),
		metadata: { name: $type, category: 'input' },
		render: () => null,
	});

const sized = field('sized', ['size']);
const surfaced = field('surfaced', ['size', 'surface']);
const toned = field('toned', ['size', 'tone']);
const plain = field('plain');

const card = defineFormRecipe(cardSpec, {});
const cardWizard = defineFormRecipe(cardWizardSpec, {});

type Schema = Record<string, unknown>;

interface AppearanceJsonSchema {
	type?: string;
	properties?: Record<string, { enum?: string[] }>;
	additionalProperties?: boolean;
}

function definitions(schema: Schema): Record<string, Schema> {
	return schema.$defs as Record<string, Schema>;
}

function appearanceOfElement(schema: Schema, $type: string): AppearanceJsonSchema | undefined {
	const properties = definitions(schema)[`element:${$type}`].properties as Record<string, AppearanceJsonSchema>;
	return properties.appearance;
}

function appearanceOfSlot(schema: Schema, recipe: string, slot: string): AppearanceJsonSchema | undefined {
	const slots = definitions(schema)[`recipe:${recipe}`].properties as Record<
		string,
		{ properties?: Record<string, AppearanceJsonSchema> }
	>;
	return slots[slot].properties?.appearance;
}

const axesOf = (appearance: AppearanceJsonSchema | undefined) => Object.keys(appearance?.properties ?? {});

describe('an element lists the axes it declares', () => {
	const engine = createFormEngine({ elements: [sized, surfaced, plain] });
	const schema = engine.generateFormConfigSchema() as Schema;

	test('a field that declares size lists it as an enum', () => {
		const appearance = appearanceOfElement(schema, 'sized');
		expect(appearance?.properties?.size.enum).toEqual(['compact', 'default', 'comfortable']);
	});

	test('an axis the field does not declare is not allowed', () => {
		const appearance = appearanceOfElement(schema, 'sized');
		expect(axesOf(appearance)).toEqual(['size']);
		expect(appearance?.additionalProperties).toBe(false);
	});

	test('an element lists each axis it declares and no other', () => {
		expect(axesOf(appearanceOfElement(schema, 'surfaced'))).toEqual(['size', 'surface']);
		expect(appearanceOfElement(schema, 'surfaced')?.properties?.surface.enum).toEqual([
			'flat',
			'outlined',
			'elevated',
		]);
	});

	test('an element with no declared axes accepts an empty closed appearance', () => {
		const appearance = appearanceOfElement(schema, 'plain');
		expect(axesOf(appearance)).toEqual([]);
		expect(appearance?.additionalProperties).toBe(false);
	});

	test('the input schema agrees', () => {
		const input = engine.generateFormConfigSchema({ io: 'input' }) as Schema;
		expect(axesOf(appearanceOfElement(input, 'sized'))).toEqual(['size']);
	});

	test('the schema collection carries the same appearance', () => {
		const collection = engine.generateJSONSchemaCollection().schemas as Record<string, Schema>;
		const properties = collection['element:sized'].properties as Record<string, AppearanceJsonSchema>;
		expect(axesOf(properties.appearance)).toEqual(['size']);
	});
});

describe('a host axis appears where it is declared', () => {
	const engine = createFormEngine({
		elements: [sized, toned],
		layout: { appearance: [...builtInAxes, tone] },
	});
	const schema = engine.generateFormConfigSchema() as Schema;

	test('only the element that declares tone lists it, with its values', () => {
		expect(appearanceOfElement(schema, 'toned')?.properties?.tone.enum).toEqual(['neutral', 'brand']);
		expect(axesOf(appearanceOfElement(schema, 'sized'))).toEqual(['size']);
	});

	test('the form and step still list every axis of the theme', () => {
		const form = schema.properties as Record<string, AppearanceJsonSchema>;
		expect(axesOf(form.appearance)).toEqual(['size', 'surface', 'tone']);
	});
});

describe('a recipe slot lists the axes it declares', () => {
	const engine = createFormEngine({ elements: [sized], recipes: [card, cardWizard] });
	const schema = engine.generateFormConfigSchema() as Schema;

	test('the card shell lists size and surface as enums', () => {
		const appearance = appearanceOfSlot(schema, 'card', 'shell');
		expect(axesOf(appearance)).toEqual(['size', 'surface']);
		expect(appearance?.properties?.surface.enum).toEqual(['flat', 'outlined', 'elevated']);
		expect(appearance?.additionalProperties).toBe(false);
	});

	test('the recipe view schema lists the same axes', () => {
		const viewSchema = engine.describeRecipe('card').viewSchema as {
			$defs: Record<string, { properties: Record<string, { properties: Record<string, AppearanceJsonSchema> }> }>;
		};
		const shell = viewSchema.$defs['recipe:card'].properties.shell;
		expect(axesOf(shell.properties.appearance)).toEqual(['size', 'surface']);
	});

	test('a slot that declares no axes lists an empty closed appearance', () => {
		const appearance = appearanceOfSlot(schema, 'card', 'header');
		expect(axesOf(appearance)).toEqual([]);
		expect(appearance?.additionalProperties).toBe(false);
	});

	test('a host axis a recipe slot does not declare is not listed', () => {
		const themed = createFormEngine({
			elements: [sized],
			recipes: [card],
			layout: { appearance: [...builtInAxes, tone] },
		});
		const themedSchema = themed.generateFormConfigSchema() as Schema;
		expect(axesOf(appearanceOfSlot(themedSchema, 'card', 'shell'))).toEqual(['size', 'surface']);
	});
});

describe('the schema catalog keeps the validator schemas', () => {
	test('each registration is found by its own schema, not the export one', () => {
		const engine = createFormEngine({ elements: [sized], recipes: [card] });
		const catalog = engine.getSchemaCatalog();
		const element = engine.getElement('sized');
		const recipe = engine.getRecipe('card');
		expect(catalog.getBySchema(element!.schema)?.id).toBe('element:sized');
		expect(catalog.has(recipe!.schema)).toBe(true);
	});
});

describe('a Standard Schema element', () => {
	test('lists its declared axes beside the $type', () => {
		const native = {
			$type: 'native',
			appearanceAxes: ['size'],
			schema: {
				'~standard': {
					version: 1,
					vendor: 'test',
					validate: (value: unknown) => ({ value }),
				},
			},
			metadata: { name: 'Native', category: 'input' },
			render: () => null,
		};
		const engine = createFormEngine({ elements: [native as never] });
		const schema = engine.generateFormConfigSchema() as Schema;
		const steps = (schema.properties as Record<string, { items: { properties: Record<string, unknown> } }>).steps;
		const elements = steps.items.properties.elements as { items: { properties: Record<string, unknown> } };
		const envelope = elements.items.properties.appearance as AppearanceJsonSchema;
		expect(axesOf(envelope)).toEqual(['size']);
	});
});

describe('the children of a container are typed like top-level elements', () => {
	const fieldset = field(
		'fieldset',
		undefined,
		z.extend(BaseFieldSchema, {
			$type: z.literal('fieldset'),
			elements: elementChildrenSchema.check(z.minLength(1)),
		}),
	);
	const engine = createFormEngine({ elements: [sized, plain, fieldset] });
	const schema = engine.generateFormConfigSchema() as Schema;
	const children = (definitions(schema)['element:fieldset'].properties as Record<string, Schema>).elements as {
		minItems?: number;
		items: Schema;
	};

	test('a fieldset keeps the array rule of its schema', () => {
		expect(children.minItems).toBe(1);
	});

	test('its child item is the element union, not a bare object with a $type', () => {
		expect(children.items).toEqual({ $ref: expect.stringMatching(/^#\/\$defs\//) });
		const union = (schema.$defs as Record<string, Schema>)[(children.items.$ref as string).split('/').pop()!];
		const members = (union.anyOf as Array<{ $ref?: string }>).map((member) => member.$ref);
		expect(members).toEqual(['#/$defs/element:sized', '#/$defs/element:plain', '#/$defs/element:fieldset']);
	});

	test('a child lists the axes its element declares', () => {
		const union = (schema.$defs as Record<string, Schema>)[(children.items.$ref as string).split('/').pop()!];
		const memberOf = ($type: string) => {
			const ref = (union.anyOf as Array<{ $ref: string }>).find((member) => member.$ref.endsWith(`:${$type}`));
			return definitions(schema)[ref!.$ref.split('/').pop()!];
		};
		const appearanceOf = (member: Schema) => (member.properties as Record<string, AppearanceJsonSchema>).appearance;

		expect(appearanceOf(memberOf('sized')).properties?.size?.enum).toEqual(['compact', 'default', 'comfortable']);
		expect(axesOf(appearanceOf(memberOf('plain')))).toEqual([]);
	});
});

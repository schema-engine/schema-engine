import { describe, expect, test } from 'vitest';
import { builtInAxes, defineAxis } from '@schema-engine/layout';
import { createFormEngine } from '@/engine/create-form-engine';

const tone = defineAxis({
	$type: 'tone',
	metadata: { name: 'Tone', description: 'Emphasis of the colour.' },
	default: 'neutral',
	values: { neutral: {}, brand: {} },
});

interface AppearanceJsonSchema {
	properties: Record<string, { enum?: string[]; description?: string }>;
	additionalProperties?: boolean;
}

function appearanceOf(schema: Record<string, unknown>, path: 'form' | 'step'): AppearanceJsonSchema {
	const properties = schema.properties as Record<string, Record<string, unknown>>;
	const host =
		path === 'form' ? properties : (properties.steps.items as { properties: typeof properties }).properties;
	return host.appearance as unknown as AppearanceJsonSchema;
}

describe('the JSON Schema export lists axis values', () => {
	const engine = createFormEngine();

	test('appearance.size is an enum of compact, default and comfortable', () => {
		const schema = engine.generateFormConfigSchema() as Record<string, unknown>;
		expect(appearanceOf(schema, 'form').properties.size.enum).toEqual(['compact', 'default', 'comfortable']);
		expect(appearanceOf(schema, 'form').properties.surface.enum).toEqual(['flat', 'outlined', 'elevated']);
	});

	test('a step lists the same axes', () => {
		const schema = engine.generateFormConfigSchema() as Record<string, unknown>;
		expect(appearanceOf(schema, 'step').properties.size.enum).toEqual(['compact', 'default', 'comfortable']);
	});

	test('an axis a host adds is listed, and an axis the theme lacks is not', () => {
		const themed = createFormEngine({ layout: { appearance: [...builtInAxes, tone] } });
		const themedAppearance = appearanceOf(themed.generateFormConfigSchema() as Record<string, unknown>, 'form');
		expect(themedAppearance.properties.tone.enum).toEqual(['neutral', 'brand']);
		const plainAppearance = appearanceOf(engine.generateFormConfigSchema() as Record<string, unknown>, 'form');
		expect(plainAppearance.properties).not.toHaveProperty('tone');
		expect(plainAppearance.additionalProperties).toBe(false);
	});

	test('the input and output schemas agree', () => {
		const input = appearanceOf(engine.generateFormConfigSchema({ io: 'input' }) as Record<string, unknown>, 'form');
		expect(input.properties.size.enum).toEqual(['compact', 'default', 'comfortable']);
	});
});

describe('the catalog lists every axis', () => {
	test('each axis is a catalog entry and a JSON Schema collection entry', () => {
		const engine = createFormEngine({ layout: { appearance: [...builtInAxes, tone] } });
		const catalog = engine.getSchemaCatalog();
		expect(catalog.get('axis:size')).toMatchObject({ title: 'Size', componentType: 'axis' });
		expect(catalog.get('axis:tone')).toMatchObject({ title: 'Tone', description: 'Emphasis of the colour.' });
		const schemas = engine.generateJSONSchemaCollection().schemas as Record<string, { enum?: string[] }>;
		expect(schemas['axis:size'].enum).toEqual(['compact', 'default', 'comfortable']);
		expect(schemas['axis:tone'].enum).toEqual(['neutral', 'brand']);
	});

	test('a replaced axis is listed once, with the winning values', () => {
		const dense = defineAxis({
			$type: 'size',
			metadata: { name: 'Dense size' },
			default: 'dense',
			values: { dense: {}, airy: {} },
		});
		const engine = createFormEngine({ layout: { appearance: [...builtInAxes, dense] } });
		const schemas = engine.generateJSONSchemaCollection().schemas as Record<string, { enum?: string[] }>;
		expect(schemas['axis:size'].enum).toEqual(['dense', 'airy']);
		expect(engine.getSchemaCatalog().get('axis:size')?.title).toBe('Dense size');
	});
});

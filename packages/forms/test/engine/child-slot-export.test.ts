import { RegistryError } from '@schema-engine/registry';
import type { StandardJSONSchemaV1, StandardSchemaV1 } from '@standard-schema/spec';
import * as v from 'valibot';
import * as classic from 'zod';
import { describe, expect, test } from 'vitest';
import * as z from 'zod/mini';
import * as api from '@/index';
import { createFormEngine } from '@/engine/create-form-engine';
import { elementChildrenSchema } from '@/lib/element-children';
import type { ElementRegistrationConstraint } from '@/builder/types.utils';
import { ElementCategory } from '@/types/categories';
import { defineInput } from '@/types/define-element';
import { compileCollectionEntry, compileDocument } from '../lib/compile-json-schema';
import { anyValue } from '../lib/any-value';

const metadata = (name: string) => ({ name, category: ElementCategory.INPUT });

const tab = defineInput({
	$type: 'tab',
	schema: z.looseObject({ $type: z.literal('tab'), elements: elementChildrenSchema }),
	childPaths: [{ keys: ['elements'], list: true }],
	metadata: metadata('Tab'),
	render: () => null,
});

const text = defineInput({
	$type: 'text',
	schema: z.looseObject({ $type: z.literal('text') }),
	value: anyValue,
	metadata: metadata('Text'),
	render: () => null,
});

/** A Standard Schema written by hand that accepts any value and exports the JSON Schema it is given. */
function exporting(jsonSchema: Record<string, unknown>): StandardSchemaV1 & StandardJSONSchemaV1 {
	return {
		'~standard': {
			version: 1,
			vendor: 'schema-engine-test',
			validate: (value: unknown) => ({ value }),
			jsonSchema: { input: () => structuredClone(jsonSchema), output: () => structuredClone(jsonSchema) },
		},
	};
}

/** A Standard Schema with no JSON Schema, which the export lists as an open object. */
function validating(): StandardSchemaV1 {
	return {
		'~standard': { version: 1, vendor: 'schema-engine-test', validate: (value: unknown) => ({ value }) },
	};
}

const tabsObject = (elements: Record<string, unknown>) => ({
	type: 'object',
	properties: { $type: { const: 'tabs' }, elements },
	required: ['$type'],
});

const anyChild = { type: 'object', properties: { $type: { type: 'string' } }, required: ['$type'] };

/** A `tabs` container that accepts only `tab`, whose schema is the one given. */
function tabs(schema: unknown, extra: Record<string, unknown> = {}): ElementRegistrationConstraint {
	return {
		$type: 'tabs',
		kind: 'input',
		childPaths: [{ keys: ['elements'], list: true, accepts: ['tab'] }],
		schema,
		metadata: metadata('Tabs'),
		render: () => null,
		...extra,
	} as ElementRegistrationConstraint;
}

const object = (elements: z.ZodMiniType) => z.looseObject({ $type: z.literal('tabs'), elements });
const classicObject = (elements: classic.ZodType) => classic.looseObject({ $type: classic.literal('tabs'), elements });

/** One container per provider and per wrapper of its children, each holding `tab`s and nothing else. */
const providers: ReadonlyArray<readonly [string, () => ElementRegistrationConstraint]> = [
	['a Zod Mini array', () => tabs(object(elementChildrenSchema))],
	['a Zod Mini array with a minimum length', () => tabs(object(elementChildrenSchema.check(z.minLength(1))))],
	['a Zod Mini optional array', () => tabs(object(z.optional(elementChildrenSchema)))],
	['a Zod Mini array with a default', () => tabs(object(z._default(elementChildrenSchema, [])))],
	['a Zod Mini readonly array', () => tabs(object(z.readonly(elementChildrenSchema)))],
	[
		'a Zod Mini array under a pipe',
		() =>
			tabs(
				z.pipe(
					object(elementChildrenSchema),
					z.transform((value) => value),
				),
			),
	],
	['a classic Zod array', () => tabs(classicObject(classic.array(classic.looseObject({ $type: classic.string() }))))],
	[
		'a classic Zod optional array',
		() => tabs(classicObject(classic.array(classic.looseObject({ $type: classic.string() })).optional())),
	],
	['a Standard JSON Schema object', () => tabs(exporting(tabsObject({ type: 'array', items: anyChild })))],
	['a Standard JSON Schema open slot', () => tabs(exporting(tabsObject({})))],
	[
		'a Valibot schema, which the export cannot read',
		() =>
			tabs(
				v.object({
					$type: v.literal('tabs'),
					elements: v.array(v.object({ $type: v.string() })),
				}),
			),
	],
	['a Standard Schema with no JSON Schema', () => tabs(validating())],
];

const validForm = {
	id: 'form',
	steps: [
		{
			id: 'step',
			title: 'Step',
			elements: [{ $type: 'tabs', elements: [{ $type: 'tab', elements: [{ $type: 'text' }] }] }],
		},
	],
};

const formWithChild = (child: Record<string, unknown>) => ({
	...validForm,
	steps: [{ ...validForm.steps[0], elements: [{ $type: 'tabs', elements: [child] }] }],
});

const withLabel = (label: unknown) => ({
	...validForm,
	steps: [
		{
			...validForm.steps[0],
			elements: [{ $type: 'tabs', label, elements: [{ $type: 'tab', elements: [] }] }],
		},
	],
});

const withChild = (child: unknown) => ({ $type: 'tab', elements: [child] });

const inForm = (child: unknown) => ({
	id: 'form',
	steps: [{ id: 'step', title: 'Step', elements: [withChild(child)] }],
});

const uri = (id: string) => `https://example.test/schemas/${id}.json`;

/** What a call throws, so the test can read the error's code and details. */
function thrown(run: () => unknown): unknown {
	try {
		run();
	} catch (error) {
		return error;
	}
	throw new Error('Expected the export to throw');
}

/** An engine whose `tabs` container has a schema the export cannot read, with the `containerKind` given. */
const openTabsEngine = (containerKind?: 'array') =>
	createFormEngine({ elements: [tabs(validating(), containerKind ? { containerKind } : {}), tab, text] });

describe.each(providers)('the children of a container written as %s', (_label, createTabs) => {
	const engine = createFormEngine({ elements: [createTabs(), tab, text] });

	describe.each(['draft-2020-12', 'draft-07'] as const)('in a document for %s', (target) => {
		const accepts = compileDocument(engine.generateFormConfigSchema({ target }), target);

		test('accepts the element it lists', () => {
			expect(accepts(validForm)).toBe(true);
		});

		test('rejects an element it does not accept', () => {
			expect(accepts(formWithChild({ $type: 'text' }))).toBe(false);
		});

		test('still checks the accepted child against its own definition', () => {
			expect(accepts(formWithChild({ $type: 'tab', elements: [{ $type: 'tab', elements: 'x' }] }))).toBe(false);
		});
	});

	describe.each(['draft-2020-12', 'draft-07'] as const)('in a collection for %s', (target) => {
		const collection = engine.generateJSONSchemaCollection({ uri, target }) as unknown as {
			schemas: Record<string, object>;
		};
		const accepts = compileCollectionEntry(collection, uri('element:tabs'), target);

		test('accepts the element it lists', () => {
			expect(accepts({ $type: 'tabs', elements: [{ $type: 'tab', elements: [] }] })).toBe(true);
		});

		test('rejects an element it does not accept', () => {
			expect(accepts({ $type: 'tabs', elements: [{ $type: 'text' }] })).toBe(false);
		});
	});

	test('the Standard JSON Schema of the form config types them the same way', () => {
		const document = engine.getFormConfigStandardSchema()['~standard'].jsonSchema.input({
			target: 'draft-2020-12',
		});
		const accepts = compileDocument(document);

		expect(accepts(validForm)).toBe(true);
		expect(accepts(formWithChild({ $type: 'text' }))).toBe(false);
	});
});

describe('a Standard JSON Schema container that refers to a definition of its own', () => {
	const labelled = tabs(
		exporting({
			type: 'object',
			properties: {
				$type: { const: 'tabs' },
				label: { $ref: '#/$defs/label' },
				elements: { type: 'array', items: anyChild },
			},
			required: ['$type'],
			$defs: { label: { type: 'string' } },
		}),
	);
	const engine = createFormEngine({ elements: [labelled, tab, text] });

	test('types its children in the document, where the converter moves the schema to a definition of its own', () => {
		const accepts = compileDocument(engine.generateFormConfigSchema());

		expect(accepts(validForm)).toBe(true);
		expect(accepts(formWithChild({ $type: 'text' }))).toBe(false);
	});

	test('keeps the definition it refers to', () => {
		const accepts = compileDocument(engine.generateFormConfigSchema());
		expect([accepts(withLabel('x')), accepts(withLabel(1))]).toEqual([true, false]);
	});

	test('types its children in the collection', () => {
		const collection = engine.generateJSONSchemaCollection({ uri }) as unknown as {
			schemas: Record<string, object>;
		};
		const accepts = compileCollectionEntry(collection, uri('element:tabs'));

		expect(accepts({ $type: 'tabs', elements: [{ $type: 'tab', elements: [] }] })).toBe(true);
		expect(accepts({ $type: 'tabs', elements: [{ $type: 'text' }] })).toBe(false);
	});
});

describe('a Standard JSON Schema container that sets an $id of its own', () => {
	const resource = tabs(
		exporting({
			$id: 'https://example.test/tabs',
			type: 'object',
			properties: { $type: { const: 'tabs' }, elements: { type: 'array', items: anyChild } },
			required: ['$type'],
		}),
	);
	const engine = createFormEngine({ elements: [resource, tab, text] });

	test('cannot be typed in a document, where a $ref written in it would resolve against its $id', () => {
		const error = thrown(() => engine.generateFormConfigSchema());

		expect(error).toBeInstanceOf(RegistryError);
		expect(error).toMatchObject({ code: 'unreachable-child-path', $type: 'tabs', childPath: ['elements'] });
	});

	test('cannot be typed in a collection either, since its slot is inside a resource of its own', () => {
		const error = thrown(() => engine.generateJSONSchemaCollection({ uri }));

		expect(error).toBeInstanceOf(RegistryError);
		expect(error).toMatchObject({ code: 'unreachable-child-path', $type: 'tabs', childPath: ['elements'] });
	});
});

describe('an element whose Standard JSON Schema sets an $id of its own, held by a container', () => {
	const leaf = {
		$type: 'leaf',
		kind: 'static',
		schema: exporting({
			$id: 'https://example.test/leaf',
			type: 'object',
			properties: { $type: { const: 'leaf' }, label: { $ref: '#/$defs/label' } },
			required: ['$type'],
			$defs: { label: { type: 'string' } },
		}),
		metadata: { name: 'Leaf', category: 'content' },
		render: () => null,
	} as ElementRegistrationConstraint;
	const engine = createFormEngine({ elements: [tab, leaf, text] });

	test('is referred to from the collection by its URI, and keeps its own base for its own references', () => {
		const collection = engine.generateJSONSchemaCollection({ uri }) as unknown as {
			schemas: Record<string, object>;
		};
		const accepts = compileCollectionEntry(collection, uri('element:tab'));

		expect(accepts(withChild({ $type: 'leaf', label: 'x' }))).toBe(true);
		expect(accepts(withChild({ $type: 'leaf', label: 1 }))).toBe(false);
		expect(accepts(withChild({ $type: 'other' }))).toBe(false);
	});

	test.each(['draft-2020-12', 'draft-07'] as const)('is referred to from a collection for %s', (target) => {
		const collection = engine.generateJSONSchemaCollection({ uri, target }) as unknown as {
			schemas: Record<string, object>;
		};
		const accepts = compileCollectionEntry(collection, uri('element:tab'), target);

		expect(accepts(withChild({ $type: 'leaf', label: 'x' }))).toBe(true);
		expect(accepts(withChild({ $type: 'leaf', label: 1 }))).toBe(false);
	});

	test('is referred to from the document by its definition', () => {
		const accepts = compileDocument(engine.generateFormConfigSchema());

		expect(accepts(inForm({ $type: 'leaf', label: 'x' }))).toBe(true);
		expect(accepts(inForm({ $type: 'leaf', label: 1 }))).toBe(false);
	});
});

describe('the children of a container are a list whatever its schema leaves open', () => {
	const open = createFormEngine({
		elements: [tabs(exporting(tabsObject({ description: 'Anything' }))), tab, text],
	});
	const list = { description: 'Anything', type: 'array', items: { anyOf: [{ $ref: '#/$defs/element:tab' }] } };

	test('an open slot of a Standard JSON Schema container is an array in the document', () => {
		const document = open.generateFormConfigSchema() as unknown as {
			$defs: Record<string, { properties: Record<string, unknown> }>;
		};

		expect(document.$defs['element:tabs']!.properties.elements).toEqual(list);
	});

	test('and in the collection', () => {
		const collection = open.generateJSONSchemaCollection({ uri }) as unknown as {
			schemas: Record<string, { properties: Record<string, unknown> }>;
		};

		expect(collection.schemas['element:tabs']!.properties.elements).toEqual({
			...list,
			items: { anyOf: [{ $ref: uri('element:tab') }] },
		});
	});

	test('so a single child object is not accepted where a list goes', () => {
		const accepts = compileDocument(open.generateFormConfigSchema());
		const single = {
			...validForm,
			steps: [{ ...validForm.steps[0], elements: [{ $type: 'tabs', elements: { $type: 'tab', elements: [] } }] }],
		};

		expect(accepts(single)).toBe(false);
	});
});

describe('a container without accepts', () => {
	const group = {
		$type: 'group',
		kind: 'input',
		childPaths: [{ keys: ['elements'], list: true }],
		schema: z.looseObject({ $type: z.literal('group'), elements: elementChildrenSchema }),
		metadata: metadata('Group'),
		render: () => null,
	} as ElementRegistrationConstraint;
	const engine = createFormEngine({ elements: [group, tab, text] });
	const everyElement = ['group', 'tab', 'text'];

	test('takes every element of the engine, as a reference to each definition', () => {
		const document = engine.generateFormConfigSchema() as unknown as {
			$defs: Record<string, { properties: { elements: { items: unknown } } }>;
		};

		expect(document.$defs['element:group']!.properties.elements.items).toEqual({
			anyOf: everyElement.map(($type) => ({ $ref: `#/$defs/element:${$type}` })),
		});
	});

	test('refers to each definition of a collection by the uri it was written with', () => {
		const collection = engine.generateJSONSchemaCollection({ uri }) as unknown as {
			schemas: Record<string, { properties: { elements: { items: unknown } } }>;
		};

		expect(collection.schemas['element:group']!.properties.elements.items).toEqual({
			anyOf: everyElement.map(($type) => ({ $ref: uri(`element:${$type}`) })),
		});
	});

	test('refers to a draft-07 definition under definitions', () => {
		const document = engine.generateFormConfigSchema({ target: 'draft-07' }) as unknown as {
			definitions: Record<string, { properties: { elements: { items: unknown } } }>;
		};

		expect(document.definitions['element:group']!.properties.elements.items).toEqual({
			anyOf: everyElement.map(($type) => ({ $ref: `#/definitions/element:${$type}` })),
		});
	});
});

describe('the slot of a container the export cannot read', () => {
	test.each([[undefined], ['array' as const]])(
		'is written as a list of the accepted elements for containerKind %s',
		(containerKind) => {
			const document = openTabsEngine(containerKind).generateFormConfigSchema() as unknown as {
				$defs: Record<string, { properties: Record<string, unknown>; required?: string[] }>;
			};
			const definition = document.$defs['element:tabs']!;

			expect(definition.properties.elements).toEqual({
				type: 'array',
				items: { anyOf: [{ $ref: '#/$defs/element:tab' }] },
			});
			expect(definition.required).not.toContain('elements');
		},
	);

	test('is listed as an entry of the collection with the same slot', () => {
		const collection = openTabsEngine().generateJSONSchemaCollection({ uri }) as unknown as {
			schemas: Record<string, { properties: Record<string, unknown> }>;
		};

		expect(collection.schemas['element:tabs']!.properties.elements).toEqual({
			type: 'array',
			items: { anyOf: [{ $ref: uri('element:tab') }] },
		});
	});
});

describe('a container whose slot cannot be reached', () => {
	const nullable = tabs(object(z.nullable(elementChildrenSchema)));
	const union = tabs(
		exporting(
			tabsObject({
				anyOf: [{ type: 'array', items: anyChild }, { type: 'string' }],
			}),
		),
	);

	describe.each([
		['nullable', nullable],
		['behind a union', union],
	])('%s', (_label, container) => {
		const engine = createFormEngine({ elements: [container, tab, text] });

		test.each([
			['the form config', () => engine.generateFormConfigSchema()],
			['the collection', () => engine.generateJSONSchemaCollection()],
			[
				'the Standard JSON Schema',
				() => engine.getFormConfigStandardSchema()['~standard'].jsonSchema.input({ target: 'draft-2020-12' }),
			],
		])('throws for %s, naming the $type', (_what, run) => {
			const error = thrown(run);

			expect(error).toBeInstanceOf(RegistryError);
			expect(error).toMatchObject({ code: 'unreachable-child-path', $type: 'tabs', childPath: ['elements'] });
		});
	});
});

describe('a container that accepts an element no registration declares', () => {
	const engine = createFormEngine({
		elements: [
			tabs(object(elementChildrenSchema), {
				childPaths: [{ keys: ['elements'], list: true, accepts: ['tab', 'ghost'] }],
			}),
			tab,
			text,
		],
	});

	test.each([
		['the form config', () => engine.generateFormConfigSchema()],
		['the collection', () => engine.generateJSONSchemaCollection()],
	])('throws unknown-accepted-type for %s, naming the container and the name', (_what, run) => {
		const error = thrown(run);

		expect(error).toBeInstanceOf(RegistryError);
		expect(error).toMatchObject({
			code: 'unknown-accepted-type',
			$type: 'tabs',
			childPath: ['elements'],
			key: 'ghost',
		});
	});

	test('still validates a form, since the name only matters to the export', () => {
		expect(engine.safeValidateForm(formWithChild({ $type: 'tab', elements: [] })).success).toBe(true);
	});
});

describe('the engine no longer exposes its schema internals', () => {
	const engine = createFormEngine({ elements: [text] });

	test.each(['getSchemaArtifacts', 'getSchemaRegistry', 'getFormConfigSchema'])('has no %s', (name) => {
		expect(name in engine).toBe(false);
	});

	test.each([
		'getSchemaCatalog',
		'generateFormConfigSchema',
		'generateJSONSchemaCollection',
		'generateActionConfigSchema',
		'getFormConfigStandardSchema',
		'getActionConfigStandardSchema',
	])('keeps %s', (name) => {
		expect(typeof (engine as unknown as Record<string, unknown>)[name]).toBe('function');
	});
});

describe('createFormEngine is the one way to make an engine', () => {
	test('FormEngine is a type of the package, not a class to construct', () => {
		expect('FormEngine' in api).toBe(false);
	});
});

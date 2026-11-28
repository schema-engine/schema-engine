import * as v from 'valibot';
import * as classic from 'zod';
import { describe, expect, test, vi } from 'vitest';
import * as z from 'zod/mini';
import type { StandardJSONSchemaV1, StandardSchemaV1 } from '@standard-schema/spec';
import { createFormEngine } from '@/engine/create-form-engine';
import { logger } from '@/lib/logger';
import { defineFormRecipe, defineRecipeSpec } from '@/recipes';
import type { ValidationRegistration } from '@/schemas/validation';
import { anyValue } from '../lib/any-value';

type JSONSchema = Record<string, unknown>;

/**
 * A Standard Schema written by hand that accepts any value and exports the JSON Schema it is given, per `io`.
 * The `target` the export asks for is recorded, so a test sees what the converter passed.
 */
function exporting(
	input: JSONSchema,
	output: JSONSchema = input,
	targets: string[] = [],
): StandardSchemaV1 & StandardJSONSchemaV1 {
	return {
		'~standard': {
			version: 1,
			vendor: 'schema-engine-test',
			validate: (value: unknown) => ({ value }),
			jsonSchema: {
				input: (options) => {
					targets.push(options.target);
					return input;
				},
				output: (options) => {
					targets.push(options.target);
					return output;
				},
			},
		},
	};
}

/** The same schema without the JSON Schema half. */
function validating(): StandardSchemaV1 {
	return {
		'~standard': { version: 1, vendor: 'schema-engine-test', validate: (value: unknown) => ({ value }) },
	};
}

const widgetInput = { type: 'object', title: 'Widget input', properties: { $type: { const: 'widget' } } };
const widgetOutput = { type: 'object', title: 'Widget output', properties: { $type: { const: 'widget' } } };
const pingInput = { type: 'object', title: 'Ping input', properties: { $type: { const: 'ping' } } };
const pingOutput = { type: 'object', title: 'Ping output', properties: { $type: { const: 'ping' } } };
const evenRule = { type: 'object', title: 'Even rule', properties: { $type: { const: 'even' } } };
const shellInput = { type: 'object', title: 'Shell input', properties: { accent: { type: 'string' } } };
const shellOutput = { type: 'object', title: 'Shell output', properties: { accent: { type: 'string' } } };

const targets: string[] = [];

const engine = createFormEngine({
	elements: [
		{
			$type: 'widget',
			kind: 'input',
			value: anyValue,
			schema: exporting(widgetInput, widgetOutput, targets),
			metadata: { name: 'Widget', category: 'input' },
			render: () => null,
		},
	],
	actions: [
		{
			$type: 'ping',
			schema: exporting(pingInput, pingOutput),
			metadata: { name: 'Ping', description: 'Ping an endpoint' },
			execute: async () => ({ status: 'success' }),
		},
	],
	validations: [
		{
			$type: 'even',
			schema: exporting(evenRule),
			metadata: { name: 'Even' },
			category: 'number',
			handler: () => z.number(),
		} as ValidationRegistration,
	],
	recipes: [
		defineFormRecipe(
			defineRecipeSpec({
				$type: 'brand',
				kind: 'single-step',
				metadata: { name: 'Brand', description: 'A recipe whose shell slot exports itself' },
				slotSchemas: {
					shell: exporting(shellInput, shellOutput),
					header: z.object({ title: z.optional(z.string()) }),
				},
			}),
			{},
		),
	],
});

type Collection = { schemas: Record<string, JSONSchema> };
const collection = (options?: Parameters<typeof engine.generateJSONSchemaCollection>[0]) =>
	engine.generateJSONSchemaCollection(options) as unknown as Collection;

/** The definition of the `ping` action in its own document, which the document refers to by `$ref`. */
function actionDefinition(options?: Parameters<typeof engine.generateActionConfigSchema>[1]): JSONSchema {
	const document = engine.generateActionConfigSchema('ping', options) as unknown as {
		$defs: Record<string, JSONSchema>;
	};
	return document.$defs['action:ping']!;
}

/** An entry of the collection without the `$id` and `$schema` the collection gives every entry. */
function entry(schemas: Collection['schemas'], id: string): JSONSchema {
	const { $id: _id, $schema: _schema, ...rest } = schemas[id]!;
	return rest;
}

describe('a schema that provides Standard JSON Schema is exported as exactly what it returns', () => {
	test('an element', () => {
		expect(entry(collection().schemas, 'element:widget')).toEqual(widgetInput);
	});

	test('an action, in the collection and as its own document, which adds the catalog annotations it lacks', () => {
		expect(entry(collection().schemas, 'action:ping')).toEqual(pingInput);
		expect(actionDefinition()).toEqual({ ...pingInput, description: 'Ping an endpoint', componentType: 'action' });
	});

	test('a validation rule, as a member of the rule union the elements refer to', () => {
		expect(entry(collection().schemas, 'validation-rule').anyOf).toContainEqual(evenRule);
	});

	test('a recipe slot, beside a Zod slot of the same recipe', () => {
		const view = engine.describeRecipe('brand').viewSchema as { $defs: Record<string, { properties: JSONSchema }> };
		const { shell, header } = view.$defs['recipe:brand']!.properties;
		expect(shell).toEqual({ ...shellInput, default: {} });
		expect(Object.keys((header as { properties: JSONSchema }).properties).toSorted()).toEqual([
			'appearance',
			'title',
		]);
	});

	test('uses the output side for io output, and passes the target the export asks for', () => {
		targets.length = 0;
		expect(entry(collection({ io: 'output' }).schemas, 'element:widget')).toEqual(widgetOutput);
		expect(actionDefinition({ io: 'output' })).toMatchObject(pingOutput);
		collection({ target: 'draft-07' });
		collection({ target: 'draft-04' });
		expect(targets).toEqual(['draft-2020-12', 'draft-07', 'draft-04']);
	});

	test('a schema that is a function, as an ArkType type is', () => {
		const callable = Object.assign(() => undefined, exporting(widgetInput));
		const functional = createFormEngine({
			elements: [
				{
					$type: 'widget',
					kind: 'input',
					value: anyValue,
					schema: callable,
					metadata: { name: 'Widget', category: 'input' },
					render: () => null,
				},
			],
		});
		expect(
			entry((functional.generateJSONSchemaCollection() as unknown as Collection).schemas, 'element:widget'),
		).toEqual(widgetInput);
	});

	test('does not change the object the schema returned', () => {
		const returned = { type: 'object', properties: {} };
		const once = createFormEngine({
			elements: [
				{
					$type: 'once',
					kind: 'input',
					value: anyValue,
					schema: exporting(returned),
					metadata: { name: 'Once', category: 'input' },
					render: () => null,
				},
			],
		});
		once.generateJSONSchemaCollection();
		expect(returned).toEqual({ type: 'object', properties: {} });
	});
});

describe('a schema the export cannot read is listed as an open object', () => {
	const open = createFormEngine({
		elements: [
			{
				$type: 'widget',
				kind: 'input',
				value: anyValue,
				schema: validating(),
				metadata: { name: 'Widget', category: 'input' },
				render: () => null,
			},
			{
				$type: 'note',
				kind: 'input',
				value: anyValue,
				schema: v.object({ $type: v.literal('note') }),
				metadata: { name: 'Note', category: 'input' },
				render: () => null,
			},
		],
		actions: [
			{
				$type: 'ping',
				schema: v.object({ $type: v.literal('ping') }),
				metadata: { name: 'Ping' },
				execute: async () => ({ status: 'success' }),
			},
		],
		validations: [
			{
				$type: 'even',
				schema: v.object({ $type: v.literal('even') }),
				metadata: { name: 'Even' },
				category: 'number',
				handler: () => z.number(),
			} as ValidationRegistration,
		],
	});

	test('a Valibot or hand-written element, action and rule are listed by their $type', () => {
		const config = JSON.stringify(open.generateFormConfigSchema());
		expect(config).toContain('"const":"widget"');
		expect(config).toContain('"const":"note"');
		expect(config).toContain('"const":"ping"');
		const rules = open.generateJSONSchemaCollection().schemas as unknown as Record<string, unknown>;
		expect(JSON.stringify(rules['validation-rule'])).toContain('"const":"even"');
	});

	test('an element and an action are a definition of the document and an entry of the collection', () => {
		const document = open.generateFormConfigSchema() as unknown as { $defs: Record<string, JSONSchema> };
		const entries = open.generateJSONSchemaCollection().schemas as unknown as Record<string, JSONSchema>;

		for (const id of ['element:widget', 'element:note', 'action:ping']) {
			expect(document.$defs[id]).toBeDefined();
			expect(entries[id]).toBeDefined();
		}
		expect(document.$defs['action:ping']).toMatchObject({ properties: { $type: { const: 'ping' } } });
	});

	test('an action is referred to by its definition in the form config, not listed inline', () => {
		const document = open.generateFormConfigSchema() as unknown as { properties: { actions: unknown } };
		const actions = JSON.stringify(document.properties.actions);

		expect(actions).toContain('#/$defs/action:ping');
		expect(actions).not.toContain('"const"');
	});

	test('an open action has an action config schema by its $type, as one that exports itself has', () => {
		const document = open.generateActionConfigSchema('ping') as unknown as { $defs: Record<string, JSONSchema> };

		expect(document.$defs['action:ping']).toMatchObject({ properties: { $type: { const: 'ping' } } });
	});
});

describe('a Zod schema keeps the Zod converter, though classic Zod also provides Standard JSON Schema', () => {
	test('closes the appearance of a classic Zod element, which the schema alone does not', () => {
		const engineWithClassic = createFormEngine({
			elements: [
				{
					$type: 'classic',
					kind: 'input',
					value: anyValue,
					schema: classic.object({ $type: classic.literal('classic'), label: classic.string() }),
					metadata: { name: 'Classic', category: 'input' },
					render: () => null,
				},
			],
		});
		const exported = engineWithClassic.generateJSONSchemaCollection().schemas as unknown as Record<
			string,
			{ properties: Record<string, JSONSchema> }
		>;
		expect(exported['element:classic']!.properties.appearance).toMatchObject({ type: 'object' });
	});
});

/** The schema a local JSON Pointer `$ref` (`#/a/b`) points at in a document. */
function resolve(document: unknown, ref: string): JSONSchema {
	expect(ref.startsWith('#/')).toBe(true);
	const target = ref
		.slice(2)
		.split('/')
		.map((segment) => segment.replaceAll('~1', '/').replaceAll('~0', '~'))
		.reduce<unknown>((node, segment) => (node as Record<string, unknown> | undefined)?.[segment], document);
	expect(target).toBeTypeOf('object');
	return target as JSONSchema;
}

/** A recursive schema as ArkType writes one: `$schema`, a root `$ref` and its `$defs`. */
const tree = {
	$schema: 'https://json-schema.org/draft/2020-12/schema',
	$ref: '#/$defs/node',
	$defs: {
		node: {
			type: 'object',
			properties: { $type: { const: 'tree' }, children: { type: 'array', items: { $ref: '#/$defs/node' } } },
		},
	},
};

describe('a schema that exports itself is embedded so its own references still resolve', () => {
	const recursive = createFormEngine({
		elements: [
			{
				$type: 'tree',
				kind: 'input',
				value: anyValue,
				schema: exporting(tree),
				metadata: { name: 'Tree', category: 'input' },
				render: () => null,
			},
			{
				$type: 'ruled',
				kind: 'input',
				value: anyValue,
				schema: z.object({ $type: z.literal('ruled'), rules: z.optional(z.array(z.looseObject({}))) }),
				metadata: { name: 'Ruled', category: 'input' },
				render: () => null,
			},
		],
		validations: [
			{
				$type: 'tree',
				schema: exporting(tree),
				metadata: { name: 'Tree rule' },
				category: 'string',
				handler: () => z.string(),
			} as ValidationRegistration,
		],
	});

	test('drops $schema, since the document declares the dialect', () => {
		const flat = createFormEngine({
			elements: [
				{
					$type: 'flat',
					kind: 'input',
					value: anyValue,
					schema: exporting({ $schema: 'https://json-schema.org/draft/2020-12/schema', type: 'object' }),
					metadata: { name: 'Flat', category: 'input' },
					render: () => null,
				},
			],
		});
		const config = JSON.stringify(flat.generateFormConfigSchema());
		expect(config.match(/"\$schema"/g)).toHaveLength(1);
	});

	test('in a document, hoists it into the definitions and points its references there', () => {
		const document = recursive.generateFormConfigSchema() as JSONSchema & { $defs: Record<string, JSONSchema> };
		const member = (document.$defs['validation-rule']!.anyOf as JSONSchema[]).find((rule) => '$ref' in rule)!;
		const hoisted = resolve(document, member.$ref as string);
		expect(hoisted).not.toHaveProperty('$schema');
		const node = resolve(document, hoisted.$ref as string);
		const items = (node.properties as { children: { items: { $ref: string } } }).children.items;
		expect(resolve(document, items.$ref)).toBe(node);
		expect(node.properties).toMatchObject({ $type: { const: 'tree' } });
	});

	test('in a collection, writes it as an entry of its own, referred to by its URI', () => {
		const { schemas } = recursive.generateJSONSchemaCollection() as unknown as Collection;
		const member = (schemas['validation-rule']!.anyOf as JSONSchema[]).find((rule) => '$ref' in rule)!;
		const id = (member.$ref as string).replace('#/definitions/', '');
		const { $id, $schema, ...own } = schemas[id]!;
		expect($id).toBe(member.$ref);
		expect($schema).toBe(tree.$schema);
		expect(own).toEqual({ $ref: tree.$ref, $defs: tree.$defs });
	});

	test('in a collection, an entry that is the schema itself keeps its references as they are', () => {
		const { schemas } = recursive.generateJSONSchemaCollection() as unknown as Collection;
		expect(entry(schemas, 'element:tree')).toEqual({ $ref: tree.$ref, $defs: tree.$defs });
	});
});

/** The keywords whose value is data, so nothing inside it is a reference or an anchor. */
const DATA_KEYS = new Set(['const', 'enum', 'default', 'examples']);

/** Whether a schema is the root of a resource of its own: it sets an `$id` that is not a draft-07 fragment anchor. */
const startsResource = (node: JSONSchema): boolean => typeof node.$id === 'string' && !node.$id.startsWith('#');

/** Every local `$ref` of a document with the resource it sits in, which is what the reference is resolved against. */
function localRefs(document: JSONSchema): { ref: string; resource: JSONSchema }[] {
	const found: { ref: string; resource: JSONSchema }[] = [];
	const visit = (node: unknown, resource: JSONSchema): void => {
		if (Array.isArray(node)) return node.forEach((item) => visit(item, resource));
		if (typeof node !== 'object' || node === null) return;
		const schema = node as JSONSchema;
		const scope = node !== document && startsResource(schema) ? schema : resource;
		if (typeof schema.$ref === 'string' && schema.$ref.startsWith('#'))
			found.push({ ref: schema.$ref, resource: scope });
		for (const [key, value] of Object.entries(schema)) if (!DATA_KEYS.has(key)) visit(value, scope);
	};
	visit(document, document);
	return found;
}

/** The anchors a resource declares (`$anchor`, `$dynamicAnchor`, a draft-07 `$id: '#name'`), without nested resources. */
function anchorsOf(resource: JSONSchema): Map<string, JSONSchema[]> {
	const found = new Map<string, JSONSchema[]>();
	const visit = (node: unknown): void => {
		if (Array.isArray(node)) return node.forEach(visit);
		if (typeof node !== 'object' || node === null) return;
		const schema = node as JSONSchema;
		if (node !== resource && startsResource(schema)) return;
		const fragment = typeof schema.$id === 'string' && schema.$id.startsWith('#') ? schema.$id.slice(1) : undefined;
		for (const name of [schema.$anchor, schema.$dynamicAnchor, fragment]) {
			if (typeof name === 'string') found.set(name, [...(found.get(name) ?? []), schema]);
		}
		for (const [key, value] of Object.entries(schema)) if (!DATA_KEYS.has(key)) visit(value);
	};
	visit(resource);
	return found;
}

/** What a local `$ref` points at within the resource it sits in: a JSON Pointer from its root, or an anchor of it. */
function resolveLocal(resource: JSONSchema, ref: string): JSONSchema | undefined {
	if (ref.startsWith('#/') || ref === '#') {
		const target = ref
			.slice(1)
			.split('/')
			.filter((segment) => segment !== '')
			.map((segment) => segment.replaceAll('~1', '/').replaceAll('~0', '~'))
			.reduce<unknown>((node, segment) => (node as Record<string, unknown> | undefined)?.[segment], resource);
		return typeof target === 'object' && target !== null ? (target as JSONSchema) : undefined;
	}
	return anchorsOf(resource).get(ref.slice(1))?.[0];
}

/** The local references of a document that point at nothing, and the anchors a resource of it declares twice. */
function brokenLinks(document: JSONSchema): string[] {
	const broken = localRefs(document)
		.filter(({ ref, resource }) => resolveLocal(resource, ref) === undefined)
		.map(({ ref }) => `unresolved ${ref}`);
	const resources: JSONSchema[] = [document];
	const collect = (node: unknown): void => {
		if (Array.isArray(node)) return node.forEach(collect);
		if (typeof node !== 'object' || node === null) return;
		if (node !== document && startsResource(node as JSONSchema)) resources.push(node as JSONSchema);
		for (const [key, value] of Object.entries(node)) if (!DATA_KEYS.has(key)) collect(value);
	};
	collect(document);
	for (const resource of resources) {
		for (const [name, declarations] of anchorsOf(resource)) {
			if (declarations.length > 1) broken.push(`duplicate anchor ${name}`);
		}
	}
	return broken;
}

describe('a schema that exports itself keeps its references inside the resource they belong to', () => {
	const actionOf = (schema: JSONSchema, $type = 'nested') =>
		createFormEngine({
			actions: [
				{
					$type,
					schema: exporting(schema),
					metadata: { name: $type, description: $type },
					execute: async () => ({ status: 'success' as const }),
				},
			],
		});

	test('a nested resource with its own $id is not rewritten, so its references resolve inside it', () => {
		const child = {
			$id: 'https://example.test/child',
			$defs: { value: { type: 'string' } },
			type: 'object',
			properties: { name: { $ref: '#/$defs/value' } },
		};
		const document = actionOf({ $ref: '#/$defs/child', $defs: { child } }).generateActionConfigSchema(
			'nested',
		) as unknown as { $defs: Record<string, JSONSchema> };
		const hoisted = resolve(document, document.$defs['action:nested']!.$ref as string);
		const nested = (hoisted.$defs as Record<string, JSONSchema>).child!;
		expect(hoisted.$ref).toBe('#/$defs/embedded-1/$defs/child');
		expect((nested.properties as Record<string, JSONSchema>).name).toEqual({ $ref: '#/$defs/value' });
		expect(brokenLinks(document)).toEqual([]);
	});

	test('a nested resource keeps its anchors, since they belong to it', () => {
		const child = {
			$id: 'https://example.test/child',
			$anchor: 'node',
			type: 'object',
			properties: { next: { $ref: '#node' } },
		};
		const document = actionOf({ $ref: '#/$defs/child', $defs: { child } }).generateActionConfigSchema(
			'nested',
		) as unknown as { $defs: Record<string, JSONSchema> };
		const hoisted = resolve(document, document.$defs['action:nested']!.$ref as string);
		const nested = (hoisted.$defs as Record<string, JSONSchema>).child!;
		expect(nested.$anchor).toBe('node');
		expect((nested.properties as Record<string, JSONSchema>).next).toEqual({ $ref: '#node' });
		expect(brokenLinks(document)).toEqual([]);
	});

	const tag = (name: string) => ({ $type: { const: name } });
	const anchored = {
		'inline, in draft-2020-12': {
			target: 'draft-2020-12' as const,
			schema: (name: string) => ({
				$anchor: 'node',
				type: 'object',
				properties: { ...tag(name), next: { $ref: '#node' } },
			}),
			bodyOf: (root: JSONSchema) => root,
		},
		'hoisted, in draft-2020-12': {
			target: 'draft-2020-12' as const,
			schema: (name: string) => ({
				$anchor: 'node',
				$ref: '#/$defs/body',
				$defs: { body: { type: 'object', properties: { ...tag(name), next: { $ref: '#node' } } } },
			}),
			bodyOf: (root: JSONSchema) => (root.$defs as Record<string, JSONSchema>).body!,
		},
		'hoisted, as a draft-07 fragment $id': {
			target: 'draft-07' as const,
			schema: (name: string) => ({
				$id: '#node',
				$ref: '#/definitions/body',
				definitions: { body: { type: 'object', properties: { ...tag(name), next: { $ref: '#node' } } } },
			}),
			bodyOf: (root: JSONSchema) => (root.definitions as Record<string, JSONSchema>).body!,
		},
	};

	test.each(Object.entries(anchored))('two schemas that declare the same anchor, %s, get one each', (_name, kind) => {
		const twins = createFormEngine({
			actions: ['first', 'second'].map(($type) => ({
				$type,
				schema: exporting(kind.schema($type)),
				metadata: { name: $type, description: $type },
				execute: async () => ({ status: 'success' as const }),
			})),
		});
		const document = twins.generateFormConfigSchema({ target: kind.target }) as unknown as JSONSchema;
		expect(brokenLinks(document)).toEqual([]);
		const definitions = (document.$defs ?? document.definitions) as Record<string, JSONSchema>;
		for (const $type of ['first', 'second']) {
			const written = definitions[`action:${$type}`]!;
			const root = typeof written.$ref === 'string' ? resolve(document, written.$ref) : written;
			const next = (kind.bodyOf(root).properties as Record<string, JSONSchema>).next!;
			expect(kind.bodyOf(root).properties).toMatchObject(tag($type));
			expect(resolveLocal(document, next.$ref as string)).toBe(root);
		}
	});
});

describe('a draft-07 schema whose root $id is a fragment, hoisted into a collection', () => {
	const rule = (name: string): JSONSchema => ({
		$id: '#node',
		$ref: '#/definitions/body',
		definitions: {
			body: { type: 'object', properties: { $type: { const: name }, next: { $ref: '#node' } } },
		},
	});
	const twins = createFormEngine({
		validations: ['first', 'second'].map(
			($type) =>
				({
					$type,
					schema: exporting(rule($type)),
					metadata: { name: $type },
					category: 'string',
					handler: () => z.string(),
				}) as ValidationRegistration,
		),
	});
	const { schemas } = twins.generateJSONSchemaCollection({
		target: 'draft-07',
		uri: (id) => `https://example.test/${id}`,
	}) as unknown as Collection;
	const references = (schemas['validation-rule']!.anyOf as JSONSchema[]).flatMap((member) =>
		typeof member.$ref === 'string' ? [member.$ref] : [],
	);

	const entryOf = (reference: string): JSONSchema => schemas[reference.replace('https://example.test/', '')]!;

	test('refers to each entry by its assigned URI, and each entry has that URI as its $id', () => {
		expect([...references].sort()).toEqual(['https://example.test/embedded-1', 'https://example.test/embedded-2']);
		for (const reference of references) expect(entryOf(reference).$id).toBe(reference);
	});

	test('keeps the references inside each entry resolving, and its body its own', () => {
		const bodies = references.map((reference) => {
			const written = entryOf(reference);
			expect(brokenLinks(written)).toEqual([]);
			const body = resolveLocal(written, written.$ref as string)!;
			const next = (body.properties as Record<string, JSONSchema>).next!;
			expect(resolveLocal(written, next.$ref as string)).toBe(written);
			return body.properties;
		});
		expect(bodies).toContainEqual(expect.objectContaining({ $type: { const: 'first' } }));
		expect(bodies).toContainEqual(expect.objectContaining({ $type: { const: 'second' } }));
	});
});

describe('a schema whose converter throws for a target is listed by its shape', () => {
	test('the export still succeeds, and warns with the vendor and target', () => {
		const warn = vi.spyOn(logger, 'warn').mockImplementation(() => logger);
		const unsupported: StandardSchemaV1 & StandardJSONSchemaV1 = {
			'~standard': {
				version: 1,
				vendor: 'strict-lib',
				validate: (value: unknown) => ({ value }),
				jsonSchema: {
					input: (options) => {
						if (options.target !== 'draft-2020-12') throw new Error('unsupported');
						return { type: 'object', title: 'Exact' };
					},
					output: () => ({}),
				},
			},
		};
		const strict = createFormEngine({
			elements: [
				{
					$type: 'strict',
					kind: 'input',
					value: anyValue,
					schema: unsupported,
					metadata: { name: 'Strict', category: 'input' },
					render: () => null,
				},
			],
			actions: [
				{
					$type: 'strict-action',
					schema: unsupported,
					metadata: { name: 'Strict action' },
					execute: async () => ({ status: 'success' }),
				},
			],
		});
		const { schemas } = strict.generateJSONSchemaCollection({ target: 'openapi-3.0' }) as unknown as Collection;
		expect(schemas['element:strict']).toMatchObject({
			type: 'object',
			properties: { $type: { enum: ['strict'] }, appearance: { type: 'object' } },
		});
		expect(schemas['action:strict-action']).toMatchObject({ properties: { $type: { enum: ['strict-action'] } } });
		expect(warn).toHaveBeenCalledWith(expect.stringMatching(/'strict-lib'.*'openapi-3\.0'/), expect.anything());
		expect(
			entry((strict.generateJSONSchemaCollection() as unknown as Collection).schemas, 'element:strict'),
		).toEqual({ type: 'object', title: 'Exact' });
		warn.mockRestore();
	});
});

describe('two registrations that share one schema object', () => {
	test('each keeps its own entry and catalog annotations', () => {
		const shared = exporting({ type: 'object' });
		const twins = createFormEngine({
			actions: ['one', 'two'].map(($type) => ({
				$type,
				schema: shared,
				metadata: { name: $type, description: `Action ${$type}` },
				execute: async () => ({ status: 'success' as const }),
			})),
		});
		const { schemas } = twins.generateJSONSchemaCollection() as unknown as Collection;
		expect(entry(schemas, 'action:one')).toEqual({ type: 'object' });
		expect(entry(schemas, 'action:two')).toEqual({ type: 'object' });
		for (const $type of ['one', 'two']) {
			const document = twins.generateActionConfigSchema($type) as { $defs: Record<string, JSONSchema> };
			expect(document.$defs[`action:${$type}`]).toMatchObject({ description: `Action ${$type}` });
		}
	});
});

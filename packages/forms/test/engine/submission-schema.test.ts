import { describe, expect, test } from 'vitest';
import type { StandardJSONSchemaV1, StandardSchemaV1 } from '@standard-schema/spec';
import * as classic from 'zod';
import * as z from 'zod/mini';
import { createFormEngine } from '@/engine/create-form-engine';
import { issuePath } from '@/engine/submission-schema';
import { createFormStateContainer } from '@/state-container/create-form-state-container';
import { defineInput, defineStatic } from '@/types';
import { BaseFieldSchema } from '@/schemas/base-field';

const text = defineInput({
	$type: 'text',
	schema: z.extend(BaseFieldSchema, { $type: z.literal('text') }),
	metadata: { name: 'Text', category: 'input' },
	value: () => z.string(),
	render: () => null,
});

const select = defineInput({
	$type: 'select',
	schema: z.extend(BaseFieldSchema, {
		$type: z.literal('select'),
		multiple: z.optional(z.boolean()),
		options: z.array(z.object({ value: z.union([z.string(), z.number()]), label: z.string() })),
	}),
	metadata: { name: 'Select', category: 'input' },
	value: ({ options, multiple }) => {
		const one = z.literal(options.map((option) => option.value));
		return multiple ? z.array(one) : one;
	},
	render: () => null,
});

const fieldSet = defineInput({
	childPaths: [{ keys: ['elements'], list: true }],
	$type: 'fieldSet',
	schema: z.extend(BaseFieldSchema, {
		$type: z.literal('fieldSet'),
		elements: z.array(z.looseObject({ $type: z.string() })),
	}),
	metadata: { name: 'Fieldset', category: 'input' },
	render: () => null,
});

const rows = defineInput({
	childPaths: [{ keys: ['elements'], list: true }],
	$type: 'rows',
	containerKind: 'array',
	schema: z.extend(BaseFieldSchema, {
		$type: z.literal('rows'),
		initialValues: z.optional(z.record(z.string(), z.any())),
		elements: z.array(z.looseObject({ $type: z.string() })),
	}),
	metadata: { name: 'Rows', category: 'input' },
	render: () => null,
});

const note = defineStatic({
	$type: 'note',
	schema: z.extend(BaseFieldSchema, { $type: z.literal('note') }),
	metadata: { name: 'Note', category: 'content' },
	render: () => null,
});

/** An input whose value is `value`. */
const leaf = ($type: string, value: StandardSchemaV1) =>
	defineInput({
		$type,
		schema: z.extend(BaseFieldSchema, { $type: z.literal($type) }),
		metadata: { name: $type, category: 'input' },
		value: () => value,
		render: () => null,
	});

const engine = createFormEngine({ elements: [text, select, fieldSet, rows, note] });

type Element = Record<string, unknown>;
const form = (elements: Element[], extra: Record<string, unknown> = {}) =>
	engine.validateForm({ id: 'f', steps: [{ id: 's', title: 'S', elements }], ...extra });

const parse = (config: ReturnType<typeof form>, value: unknown) =>
	engine.submissionSchema(config)['~standard'].validate(value) as {
		value?: unknown;
		issues?: StandardSchemaV1.Issue[];
	};

/** What the container submits once `writes` are made, parsed by the schema of the same config. */
async function submitted(config: ReturnType<typeof form>, writes: Record<string, unknown>, defaults = {}) {
	const container = createFormStateContainer({ config, registry: engine.validations, defaults });
	for (const [path, value] of Object.entries(writes)) container.setValue(path, value);
	const result = await container.submit();
	if (result.outcome !== 'passed') throw new Error(`the submission was ${result.outcome}`);
	return { values: result.values, parsed: parse(config, result.values) };
}

describe('engine.submissionSchema', () => {
	test('a field is its declared value, and the schema parses what the container submits', async () => {
		const config = form([{ $type: 'text', name: 'email' }]);
		const { values, parsed } = await submitted(config, { email: 'ada@example.com' });
		expect(parsed).toEqual({ value: values });
		expect(parse(config, { email: 3 }).issues?.map(issuePath)).toEqual(['email']);
	});

	test('dotted names nest', async () => {
		const config = form([
			{ $type: 'text', name: 'address.street' },
			{ $type: 'text', name: 'address.city' },
		]);
		const { values, parsed } = await submitted(config, { 'address.street': 'Main', 'address.city': 'Rome' });
		expect(values).toEqual({ address: { street: 'Main', city: 'Rome' } });
		expect(parsed.value).toEqual(values);
		expect(parse(config, { address: { street: 1 } }).issues?.map(issuePath)).toEqual(['address.street']);
	});

	test('a named container is an object of its children', async () => {
		const config = form([{ $type: 'fieldSet', name: 'profile', elements: [{ $type: 'text', name: 'first' }] }]);
		const { values, parsed } = await submitted(config, { 'profile.first': 'Ada' });
		expect(values).toEqual({ profile: { first: 'Ada' } });
		expect(parsed.value).toEqual(values);
		expect(parse(config, { profile: { first: 1 } }).issues?.map(issuePath)).toEqual(['profile.first']);
		expect(parse(config, { profile: 'x' }).issues?.map(issuePath)).toEqual(['profile']);
	});

	test('a container of kind array is a list of rows of objects', async () => {
		const config = form([
			{
				$type: 'rows',
				name: 'contacts',
				elements: [
					{ $type: 'text', name: 'name' },
					{ $type: 'text', name: 'email' },
				],
			},
		]);
		const { values, parsed } = await submitted(
			config,
			{ 'contacts.0.name': 'Ada', 'contacts.0.email': 'a@x.io', 'contacts.1.name': 'Bo' },
			{ contacts: [{}, {}] },
		);
		expect(values).toEqual({ contacts: [{ name: 'Ada', email: 'a@x.io' }, { name: 'Bo' }] });
		expect(parsed.value).toEqual(values);
		expect(parse(config, { contacts: [{ name: 'Ada' }, { name: 7 }] }).issues?.map(issuePath)).toEqual([
			'contacts.1.name',
		]);
		expect(parse(config, { contacts: 'no' }).issues?.map(issuePath)).toEqual(['contacts']);
	});

	test('a one-child row is a list of values, and initialValues of a record make rows objects', async () => {
		const scalar = form([{ $type: 'rows', name: 'tags', elements: [{ $type: 'text', name: 'tag' }] }]);
		const { values, parsed } = await submitted(scalar, { 'tags.0': 'a', 'tags.1': 'b' }, { tags: ['', ''] });
		expect(values).toEqual({ tags: ['a', 'b'] });
		expect(parsed.value).toEqual(values);
		expect(parse(scalar, { tags: ['a', 2] }).issues?.map(issuePath)).toEqual(['tags.1']);

		const records = form([
			{ $type: 'rows', name: 'tags', initialValues: { tag: '' }, elements: [{ $type: 'text', name: 'tag' }] },
		]);
		expect(parse(records, { tags: [{ tag: 'a' }] }).issues).toBeUndefined();
		expect(parse(records, { tags: ['a'] }).issues?.map(issuePath)).toEqual(['tags.0']);
	});

	test('payload keys are added as they are', async () => {
		const config = form([{ $type: 'text', name: 'email' }], { payload: { orderId: 7 } });
		const { values, parsed } = await submitted(config, { email: 'a@x.io' });
		expect(values).toEqual({ email: 'a@x.io', orderId: 7 });
		expect(parsed.value).toEqual(values);
	});

	test('a key no field declares is not submitted, and a static element that is named is carried as it is', async () => {
		const config = form([
			{ $type: 'text', name: 'email' },
			{ $type: 'note', name: 'aside' },
		]);
		const { values } = await submitted(config, { email: 'a@x.io' }, { stray: 'x', nested: { deep: 1 } });
		expect(values).toEqual({ email: 'a@x.io' });
		expect(parse(config, { email: 'a@x.io', stray: 'x', aside: 'y' }).value).toEqual({
			email: 'a@x.io',
			aside: 'y',
		});
	});

	test('a hidden or disabled field, and a field of a skipped step, are absent keys', async () => {
		const config = engine.validateForm({
			id: 'f',
			steps: [
				{
					id: 'one',
					title: 'One',
					elements: [
						{ $type: 'text', name: 'kind', rules: [{ $type: 'required' }] },
						{
							$type: 'text',
							name: 'company',
							rules: [{ $type: 'required' }],
							constraints: [{ field: 'kind', operator: 'equals', value: 'business', $type: 'show' }],
						},
						{ $type: 'text', name: 'locked', disabled: true, rules: [{ $type: 'required' }] },
					],
				},
				{
					id: 'two',
					title: 'Two',
					constraints: [{ field: 'kind', operator: 'equals', value: 'business', $type: 'show' }],
					elements: [{ $type: 'text', name: 'vat', rules: [{ $type: 'required' }] }],
				},
			],
		});
		const { values, parsed } = await submitted(config, { kind: 'personal', company: 'x', locked: 'y', vat: 'z' });
		expect(values).toEqual({ kind: 'personal' });
		expect(parsed.value).toEqual(values);
	});

	test('a key is required only when its field has a required rule and nothing can leave it out', () => {
		const config = form([
			{ $type: 'text', name: 'must', rules: [{ $type: 'required' }] },
			{ $type: 'text', name: 'may' },
			{
				$type: 'text',
				name: 'sometimes',
				rules: [{ $type: 'required' }],
				constraints: [{ field: 'must', operator: 'is_not_empty', value: '', $type: 'show' }],
			},
			{
				$type: 'fieldSet',
				name: 'group',
				disabled: true,
				elements: [{ $type: 'text', name: 'inner', rules: [{ $type: 'required' }] }],
			},
		]);
		expect(parse(config, {}).issues?.map(issuePath)).toEqual(['must']);
		expect(parse(config, { must: 'a' }).issues).toBeUndefined();
	});

	test('an optional field keeps its empty value, and a required one is held to its declaration', () => {
		const config = form([
			{ $type: 'text', name: 'nickname' },
			{ $type: 'select', name: 'size', options: [{ value: 1, label: 'S' }] },
		]);
		expect(parse(config, { nickname: '', size: null }).issues).toBeUndefined();
		expect(parse(config, { nickname: null }).value).toEqual({ nickname: null });
		expect(parse(config, { size: '1' }).issues?.map(issuePath)).toEqual(['size']);
	});

	test('a select declares an enum of its options, an array of it with multiple', () => {
		const single = form([
			{
				$type: 'select',
				name: 'stars',
				options: [
					{ value: 1, label: 'One' },
					{ value: 'two', label: 'Two' },
				],
			},
		]);
		expect(parse(single, { stars: 1 }).issues).toBeUndefined();
		expect(parse(single, { stars: 'two' }).issues).toBeUndefined();
		expect(parse(single, { stars: '1' }).issues?.map(issuePath)).toEqual(['stars']);
		expect(parse(single, { stars: [1] }).issues?.map(issuePath)).toEqual(['stars']);

		const many = form([{ $type: 'select', name: 'stars', multiple: true, options: [{ value: 1, label: 'One' }] }]);
		expect(parse(many, { stars: [1] }).issues).toBeUndefined();
		expect(parse(many, { stars: [2] }).issues?.map(issuePath)).toEqual(['stars.0']);
	});

	test('partial accepts any subset of the keys and any empty value, and still rejects a wrong one', () => {
		const config = form([
			{ $type: 'text', name: 'must', rules: [{ $type: 'required' }] },
			{
				$type: 'fieldSet',
				name: 'group',
				elements: [{ $type: 'text', name: 'inner', rules: [{ $type: 'required' }] }],
			},
		]);
		const { partial } = engine.submissionSchema(config);
		const check = (value: unknown) => partial['~standard'].validate(value) as { issues?: unknown[] };
		expect(check({}).issues).toBeUndefined();
		expect(check({ must: '', group: {} }).issues).toBeUndefined();
		expect(check({ must: 4 }).issues).toHaveLength(1);
	});

	test('partial reports an issue at its field: a list is one field, a leaf inside a group is its own', () => {
		const config = form([
			{ $type: 'fieldSet', name: 'group', elements: [{ $type: 'text', name: 'inner' }] },
			{ $type: 'rows', name: 'tags', elements: [{ $type: 'text', name: 'tag' }] },
		]);
		const { partial } = engine.submissionSchema(config);
		const paths = (value: unknown) => (partial['~standard'].validate(value).issues ?? []).map(issuePath);

		expect(paths({ group: { inner: 4 } })).toEqual(['group.inner']);
		expect(paths({ tags: ['a', 4, 5] })).toEqual(['tags', 'tags']);
		expect(paths({ tags: 'not a list' })).toEqual(['tags']);
	});

	test('exports JSON Schema for the submission', () => {
		const config = form(
			[
				{ $type: 'text', name: 'email', rules: [{ $type: 'required' }] },
				{
					$type: 'select',
					name: 'size',
					options: [
						{ value: 1, label: 'S' },
						{ value: 2, label: 'M' },
					],
				},
			],
			{ payload: { orderId: 7 } },
		);
		const schema = engine.submissionSchema(config)['~standard'].jsonSchema.input({ target: 'draft-2020-12' });
		expect(schema).toEqual({
			type: 'object',
			properties: {
				email: { type: 'string' },
				size: { anyOf: [{ enum: [1, 2], type: 'number' }, { const: '' }, { const: null }] },
				orderId: {},
			},
			required: ['email'],
			additionalProperties: false,
		});
		for (const target of ['draft-3', 'draft-7', 'draft-04']) {
			expect(() => engine.submissionSchema(config)['~standard'].jsonSchema.input({ target })).toThrow(
				`The JSON Schema target '${target}' is not supported for a submission.`,
			);
		}
	});

	test('describes each field by its label, then its help text', () => {
		const config = form([
			{ $type: 'text', name: 'email', label: 'Email', description: 'Where we reply' },
			{ $type: 'text', name: 'nick', label: 'Nickname' },
			{ $type: 'text', name: 'plain' },
			{
				$type: 'fieldSet',
				name: 'address',
				label: 'Address',
				elements: [{ $type: 'text', name: 'city', label: 'City' }],
			},
			{ $type: 'rows', name: 'tags', label: 'Tags', elements: [{ $type: 'text', name: 'tag', label: 'Tag' }] },
		]);

		const { properties } = engine.submissionSchema(config)['~standard'].jsonSchema.input({
			target: 'draft-2020-12',
		}) as {
			properties: Record<
				string,
				{
					description?: string;
					properties?: Record<string, { description?: string }>;
					items?: { description?: string };
				}
			>;
		};

		expect(properties.email.description).toBe('Email: Where we reply');
		expect(properties.nick.description).toBe('Nickname');
		expect(properties.plain).not.toHaveProperty('description');
		expect(properties.address.description).toBe('Address');
		expect(properties.address.properties?.city.description).toBe('City');
		expect(properties.tags.description).toBe('Tags');
		expect(properties.tags.items?.description).toBe('Tag');
	});

	test('reads a value schema by the export rule: Zod through the converter, any other by its own JSON Schema', () => {
		const tree = {
			$schema: 'https://json-schema.org/draft/2020-12/schema',
			$ref: '#/$defs/node',
			$defs: {
				node: { type: 'object', properties: { children: { type: 'array', items: { $ref: '#/$defs/node' } } } },
			},
		};
		const recursive: StandardSchemaV1 & StandardJSONSchemaV1 = {
			'~standard': {
				version: 1,
				vendor: 'test',
				validate: (value) => ({ value }),
				jsonSchema: { input: () => tree, output: () => tree },
			},
		};
		const mixed = createFormEngine({
			elements: [
				leaf('mini', z.string().check(z.minLength(2))),
				leaf('classic', classic.string().min(2)),
				leaf('date', classic.date()),
				leaf('tree', recursive),
			],
		});
		const config = mixed.validateForm({
			id: 'f',
			steps: [
				{
					id: 's',
					title: 'S',
					elements: ['mini', 'classic', 'date', 'tree'].map(($type) => ({
						$type,
						name: $type,
						rules: [{ $type: 'required' }],
					})),
				},
			],
		});
		const schema = mixed.submissionSchema(config)['~standard'].jsonSchema.input({ target: 'draft-2020-12' }) as {
			properties: Record<string, { $ref?: string }>;
			$defs: Record<string, { $ref: string; $defs: Record<string, unknown> }>;
		};
		expect(schema.properties.classic).toEqual(schema.properties.mini);
		expect(schema.properties.date).toEqual({});
		const { $ref } = schema.properties.tree;
		expect($ref).toBe('#/$defs/embedded-1');
		expect(schema.$defs['embedded-1']).toEqual({
			$ref: '#/$defs/embedded-1/$defs/node',
			$defs: {
				node: {
					type: 'object',
					properties: { children: { type: 'array', items: { $ref: '#/$defs/embedded-1/$defs/node' } } },
				},
			},
		});
	});
});

describe('createFormEngine', () => {
	const handWritten = (extra: Record<string, unknown>) =>
		({
			$type: 'hand',
			kind: 'input',
			schema: z.extend(BaseFieldSchema, { $type: z.literal('hand') }),
			metadata: { name: 'Hand', category: 'input' },
			render: () => null,
			...extra,
		}) as never;

	test('rejects an input registration that declares no value, naming its $type', () => {
		expect(() => createFormEngine({ elements: [handWritten({})] })).toThrow(
			/Element 'hand' is an input that declares no value/,
		);
	});

	test('a container kind is no container: it needs childPaths beside it', () => {
		expect(() => createFormEngine({ elements: [handWritten({ containerKind: 'object' })] })).toThrow(
			/Element 'hand' sets containerKind without childPaths/,
		);
	});

	test('a schema that is not Zod is a container by its childPaths, with no value', () => {
		const opaque: StandardSchemaV1 = {
			'~standard': { version: 1, vendor: 'test', validate: (value) => ({ value }) },
		};
		expect(() =>
			createFormEngine({
				elements: [handWritten({ schema: opaque, childPaths: [{ keys: ['elements'], list: true }] })],
			}),
		).not.toThrow();
		expect(() => createFormEngine({ elements: [handWritten({ schema: opaque })] })).toThrow(
			/Element 'hand' is an input that declares no value/,
		);
	});

	test('an input without a value is rejected whatever its metadata says, and a static element is accepted whatever its metadata says', () => {
		const category = (value: string) => ({ metadata: { name: 'Hand', category: value } });
		expect(() => createFormEngine({ elements: [handWritten(category('content'))] })).toThrow(
			/Element 'hand' is an input that declares no value/,
		);
		expect(() =>
			createFormEngine({ elements: [handWritten({ ...category('input'), kind: 'static' })] }),
		).not.toThrow();
		const labelled = defineStatic({
			$type: 'labelled',
			schema: z.extend(BaseFieldSchema, { $type: z.literal('labelled') }),
			metadata: { name: 'Labelled', category: 'input' },
			render: () => null,
		});
		expect(() => createFormEngine({ elements: [labelled] })).not.toThrow();
	});

	test('a registration written by hand states its kind, and the helpers set it', () => {
		const unstated = { ...(handWritten({}) as object), kind: undefined } as never;
		expect(() => createFormEngine({ elements: [unstated] })).toThrow(
			/Element 'hand' states no kind.*defineInput.*defineStatic/,
		);
		expect(note.kind).toBe('static');
		expect(fieldSet.kind).toBe('input');
	});

	test('accepts an input that declares its value, a container with elements and a static element', () => {
		expect(() => createFormEngine({ elements: [handWritten({ value: () => z.string() })] })).not.toThrow();
		expect(() => createFormEngine({ elements: [fieldSet] })).not.toThrow();
		expect(() => createFormEngine({ elements: [note] })).not.toThrow();
	});
});

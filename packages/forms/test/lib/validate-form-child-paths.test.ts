import { describe, expect, test } from 'vitest';
import * as v from 'valibot';
import * as z from 'zod/mini';
import { RegistryError } from '@schema-engine/registry';
import { createFormEngine } from '@/engine/create-form-engine';
import { elementChildrenSchema } from '@/lib/element-children';
import { defineInput, defineStatic } from '@/types';
import { anyValue } from './any-value';

const field = defineInput({
	value: anyValue,
	$type: 'field',
	schema: z.looseObject({ $type: z.literal('field'), id: z.string(), name: z.string() }),
	metadata: { name: 'Field', category: 'input' },
	render: () => null,
});

const tab = defineInput({
	$type: 'tab',
	schema: z.looseObject({ $type: z.literal('tab'), id: z.string(), elements: elementChildrenSchema }),
	childPaths: [{ keys: ['elements'], list: true }],
	metadata: { name: 'Tab', category: 'input' },
	render: () => null,
});

const tabs = defineInput({
	$type: 'tabs',
	schema: z.looseObject({ $type: z.literal('tabs'), id: z.string(), elements: elementChildrenSchema }),
	childPaths: [{ keys: ['elements'], list: true, accepts: ['tab'] }],
	metadata: { name: 'Tabs', category: 'input' },
	render: () => null,
});

const group = defineInput({
	$type: 'group',
	schema: z.looseObject({
		$type: z.literal('group'),
		id: z.string(),
		name: z.string(),
		elements: elementChildrenSchema,
	}),
	childPaths: [{ keys: ['elements'], list: true }],
	metadata: { name: 'Group', category: 'input' },
	render: () => null,
});

const note = defineStatic({
	$type: 'note',
	schema: z.looseObject({ $type: z.literal('note'), id: z.string() }),
	metadata: { name: 'Note', category: 'content' },
	render: () => null,
});

const formWith = (elements: unknown[]) => ({ id: 'tree', steps: [{ id: 'main', title: 'Main', elements }] });
const leaf = (name: string, extra: Record<string, unknown> = {}) => ({ $type: 'field', id: name, name, ...extra });

/** The error `createFormEngine` throws for these elements, which a test branches on by `code`. */
function buildError(elements: readonly object[]): RegistryError {
	try {
		createFormEngine({ elements: elements as never });
	} catch (error) {
		if (error instanceof RegistryError) return error;
		throw error;
	}
	throw new Error('Expected createFormEngine to throw a RegistryError');
}

describe('container child paths: the build', () => {
	test('a container is an input that declares childPaths, and its value is its children', () => {
		expect(() => createFormEngine({ elements: [field, group] })).not.toThrow();
	});

	test('containerKind alone is no container', () => {
		const handWritten = {
			kind: 'input',
			$type: 'hand',
			containerKind: 'object',
			schema: z.looseObject({ $type: z.literal('hand'), elements: elementChildrenSchema }),
			metadata: { name: 'Hand', category: 'input' },
			render: () => null,
		} as const;
		expect(buildError([handWritten])).toMatchObject({
			code: 'invalid-child-paths',
			kind: 'Element',
			$type: 'hand',
			message: expect.stringMatching(/Element 'hand'.*childPaths/),
		});
	});

	test('a container that declares a value is rejected, since its value is its children', () => {
		const withValue = {
			kind: 'input',
			$type: 'greedy',
			childPaths: [{ keys: ['elements'], list: true }],
			value: anyValue,
			schema: z.looseObject({ $type: z.literal('greedy'), elements: elementChildrenSchema }),
			metadata: { name: 'Greedy', category: 'input' },
			render: () => null,
		} as const;
		expect(buildError([withValue])).toMatchObject({
			code: 'invalid-declaration',
			kind: 'Element',
			$type: 'greedy',
			message: expect.stringMatching(/Element 'greedy'.*value/),
		});
	});

	test.each([
		['another key', [{ keys: ['items'] }], /Element 'odd'.*'elements'.*'items'/],
		['a nested key', [{ keys: ['body', 'elements'] }], /Element 'odd'.*'elements'.*'body\.elements'/],
		['two paths', [{ keys: ['elements'], list: true as const }, { keys: ['more'] }], /Element 'odd'.*child paths/],
		['no list', [{ keys: ['elements'] }], /Element 'odd'.*list: true/],
	])('forms fixes the child key: %s', (_label, childPaths, message) => {
		const odd = {
			kind: 'input',
			$type: 'odd',
			childPaths,
			schema: z.looseObject({ $type: z.literal('odd'), elements: elementChildrenSchema, items: z.unknown() }),
			metadata: { name: 'Odd', category: 'input' },
			render: () => null,
		} as const;
		expect(buildError([odd])).toMatchObject({
			code: 'invalid-child-paths',
			kind: 'Element',
			$type: 'odd',
			message: expect.stringMatching(message),
		});
	});

	test('a static element cannot declare childPaths', () => {
		const staticWithChildren = {
			kind: 'static',
			$type: 'frame',
			childPaths: [{ keys: ['elements'], list: true }],
			schema: z.looseObject({ $type: z.literal('frame'), elements: elementChildrenSchema }),
			metadata: { name: 'Frame', category: 'content' },
			render: () => null,
		} as const;
		expect(buildError([staticWithChildren])).toMatchObject({
			code: 'invalid-child-paths',
			kind: 'Element',
			$type: 'frame',
			childPath: ['elements'],
			message: expect.stringMatching(/Element 'frame'.*only an input/),
		});
	});

	test('a container with no childPaths that declares elements is named in the build error', () => {
		const forgotten = {
			kind: 'input',
			$type: 'forgotten',
			schema: z.looseObject({ $type: z.literal('forgotten'), elements: elementChildrenSchema }),
			metadata: { name: 'Forgotten', category: 'input' },
			render: () => null,
		} as const;
		expect(buildError([forgotten])).toMatchObject({
			code: 'invalid-declaration',
			kind: 'Element',
			$type: 'forgotten',
			message: expect.stringMatching(/Element 'forgotten'.*childPaths/),
		});
	});
});

describe('container child paths: a Standard Schema container that is not Zod', () => {
	const valibotGroup = defineInput({
		$type: 'v-group',
		schema: v.looseObject({
			$type: v.literal('v-group'),
			id: v.string(),
			name: v.string(),
			elements: v.array(v.looseObject({ $type: v.string() })),
		}),
		childPaths: [{ keys: ['elements'], list: true }],
		metadata: { name: 'Valibot group', category: 'input' },
		render: () => null,
	});
	const engine = createFormEngine({ elements: [field, valibotGroup] });

	test('is a container by its childPaths, and its children are validated against the engine', () => {
		const result = engine.safeValidateForm(
			formWith([{ $type: 'v-group', id: 'g', name: 'g', elements: [leaf('a'), { $type: 'field', id: 'b' }] }]),
		);
		expect(result.success).toBe(false);
		if (result.success) return;
		expect(result.issues.map((issue) => issue.path)).toEqual([['steps', 0, 'elements', 0, 'elements', 1, 'name']]);
	});

	test('keeps the normalized children', () => {
		const normalized = engine.validateForm(
			formWith([{ $type: 'v-group', id: 'g', name: 'g', elements: [leaf('a')] }]),
		);
		expect(normalized.steps[0]?.elements[0]).toMatchObject({ elements: [{ name: 'a' }] });
	});
});

describe('container child paths: accepts', () => {
	const engine = createFormEngine({ elements: [field, tab, tabs] });

	test('a container holding an element outside accepts is a registry/not-accepted issue at its $type', () => {
		const result = engine.safeValidateForm(
			formWith([
				{ $type: 'tabs', id: 't', elements: [{ $type: 'tab', id: 'one', elements: [leaf('a')] }, leaf('b')] },
			]),
		);
		expect(result.success).toBe(false);
		if (result.success) return;
		expect(result.issues).toEqual([
			expect.objectContaining({
				path: ['steps', 0, 'elements', 0, 'elements', 1, '$type'],
				code: 'registry/not-accepted',
			}),
		]);
	});

	test('a container holding what it accepts is valid', () => {
		expect(() =>
			engine.validateForm(
				formWith([{ $type: 'tabs', id: 't', elements: [{ $type: 'tab', id: 'one', elements: [leaf('a')] }] }]),
			),
		).not.toThrow();
	});
});

describe('container child paths: children are read as authored', () => {
	test('a parent schema that drops a child throws RegistryError schema-breaks-child-path', () => {
		const dropping = defineInput({
			$type: 'dropping',
			schema: z.pipe(
				z.looseObject({ $type: z.literal('dropping'), elements: elementChildrenSchema }),
				z.transform((config) => ({ ...config, elements: config.elements.slice(1) })),
			),
			childPaths: [{ keys: ['elements'], list: true }],
			metadata: { name: 'Dropping', category: 'input' },
			render: () => null,
		});
		const engine = createFormEngine({ elements: [field, dropping] });
		const attempt = () =>
			engine.safeValidateForm(formWith([{ $type: 'dropping', elements: [leaf('a'), leaf('b')] }]));
		expect(attempt).toThrow(RegistryError);
		expect(attempt).toThrow(expect.objectContaining({ code: 'schema-breaks-child-path', $type: 'dropping' }));
		expect(attempt).toThrow(expect.objectContaining({ childPath: ['elements'] }));
	});

	test('a default that holds a child throws RegistryError schema-breaks-child-path', () => {
		const defaulting = defineInput({
			$type: 'defaulting',
			schema: z.looseObject({
				$type: z.literal('defaulting'),
				elements: z._default(elementChildrenSchema, [{ $type: 'field', id: 'd', name: 'd' }]),
			}),
			childPaths: [{ keys: ['elements'], list: true }],
			metadata: { name: 'Defaulting', category: 'input' },
			render: () => null,
		});
		const engine = createFormEngine({ elements: [field, defaulting] });
		expect(() => engine.safeValidateForm(formWith([{ $type: 'defaulting' }]))).toThrow(
			expect.objectContaining({ code: 'schema-breaks-child-path' }),
		);
	});

	test('a reorder by the parent schema is discarded: issues and children keep the authored order', () => {
		const reversing = defineInput({
			$type: 'reversing',
			schema: z.pipe(
				z.looseObject({ $type: z.literal('reversing'), elements: elementChildrenSchema }),
				z.transform((config) => ({ ...config, elements: [...config.elements].reverse() })),
			),
			childPaths: [{ keys: ['elements'], list: true }],
			metadata: { name: 'Reversing', category: 'input' },
			render: () => null,
		});
		const engine = createFormEngine({ elements: [field, reversing] });

		const invalid = engine.safeValidateForm(
			formWith([{ $type: 'reversing', elements: [{ $type: 'field', id: 'first' }, leaf('second')] }]),
		);
		expect(invalid.success).toBe(false);
		if (invalid.success) return;
		expect(invalid.issues.map((issue) => issue.path)).toEqual([['steps', 0, 'elements', 0, 'elements', 0, 'name']]);

		const valid = engine.validateForm(
			formWith([{ $type: 'reversing', elements: [leaf('first'), leaf('second')] }]),
		);
		expect(valid.steps[0]?.elements[0]).toMatchObject({ elements: [{ name: 'first' }, { name: 'second' }] });
	});

	test('a node that contains itself is a registry/contains-itself issue', () => {
		const engine = createFormEngine({ elements: [field, group] });
		const cyclic: Record<string, unknown> = { $type: 'group', id: 'g', name: 'g', elements: [] };
		(cyclic.elements as unknown[]).push(cyclic);
		const result = engine.safeValidateForm(formWith([cyclic]));
		expect(result.success).toBe(false);
		if (result.success) return;
		expect(result.issues.map(({ code, path }) => ({ code, path: path.join('.') }))).toEqual([
			{ code: 'registry/contains-itself', path: 'steps.0.elements.0.elements.0' },
		]);
	});
});

describe('container child paths: an element that is not a container', () => {
	const engine = createFormEngine({ elements: [field, note] });

	test.each([
		['a static element', { $type: 'note', id: 'n', elements: [leaf('a')] }],
		['an input with a value', { $type: 'field', id: 'f', name: 'f', elements: [leaf('a')] }],
	])(
		'%s that holds elements is one issue at its elements key, and its children are not walked',
		(_label, element) => {
			const result = engine.safeValidateForm(formWith([element]));
			expect(result.success).toBe(false);
			if (result.success) return;
			expect(result.issues).toEqual([
				{
					path: ['steps', 0, 'elements', 0, 'elements'],
					message: `Element '${element.$type}' declares no child path, so it cannot hold elements.`,
				},
			]);
		},
	);
});

describe('container child paths: appearance never reaches a schema', () => {
	const strictGroup = defineInput({
		$type: 'strict-group',
		schema: z.strictObject({
			$type: z.literal('strict-group'),
			id: z.string(),
			name: z.string(),
			elements: elementChildrenSchema,
		}),
		childPaths: [{ keys: ['elements'], list: true }],
		appearanceAxes: ['size'],
		metadata: { name: 'Strict group', category: 'input' },
		render: () => null,
	});
	const strictField = defineInput({
		value: anyValue,
		$type: 'strict-field',
		schema: z.strictObject({ $type: z.literal('strict-field'), id: z.string(), name: z.string() }),
		appearanceAxes: ['size'],
		metadata: { name: 'Strict field', category: 'input' },
		render: () => null,
	});
	const engine = createFormEngine({ elements: [strictGroup, strictField] });

	test('a strict container and a strict child with appearance pass, and carry the resolved appearance', () => {
		const normalized = engine.validateForm(
			formWith([
				{
					$type: 'strict-group',
					id: 'g',
					name: 'g',
					appearance: { size: 'compact' },
					elements: [{ $type: 'strict-field', id: 'a', name: 'a', appearance: { size: 'comfortable' } }],
				},
			]),
		);
		const container = normalized.steps[0]?.elements[0] as unknown as {
			appearance?: unknown;
			elements: Array<{ appearance?: unknown }>;
		};
		expect(container.appearance).toEqual({ size: 'compact' });
		expect(container.elements[0]?.appearance).toEqual({ size: 'comfortable' });
	});

	test('a child inherits the pick of its container', () => {
		const normalized = engine.validateForm(
			formWith([
				{
					$type: 'strict-group',
					id: 'g',
					name: 'g',
					appearance: { size: 'compact' },
					elements: [{ $type: 'strict-field', id: 'a', name: 'a' }],
				},
			]),
		);
		const container = normalized.steps[0]?.elements[0] as unknown as { elements: Array<{ appearance?: unknown }> };
		expect(container.elements[0]?.appearance).toEqual({ size: 'compact' });
	});
});

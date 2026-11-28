import { afterEach, describe, expect, it, vi } from 'vitest';
import * as z from 'zod/mini';
import { createRegistry, safeParseNode, type BaseRegistration } from '../src';

const createItem = (type: string, name: string): BaseRegistration => ({
	$type: type,
	schema: z.object({ value: z.string() }),
	metadata: { name },
});

describe('createRegistry', () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe('Scenario: Last registration wins without a warning', () => {
		it('returns the later registration and logs nothing', () => {
			const spies = (['debug', 'info', 'log', 'warn', 'error'] as const).map((level) =>
				vi.spyOn(console, level).mockImplementation(() => undefined),
			);
			const first = createItem('card', 'First');
			const second = createItem('card', 'Second');

			const registry = createRegistry('Widget', [first, second]);

			expect(registry.get('card')).toEqual(second);
			expect(registry.get('card')?.metadata.name).toBe('Second');
			expect(registry.size).toBe(1);
			expect(registry.all()).toEqual([second]);
			for (const spy of spies) {
				expect(spy).not.toHaveBeenCalled();
			}
		});

		it('keeps the position of the first registration for a repeated key', () => {
			const registry = createRegistry('Widget', [
				createItem('a', 'A'),
				createItem('b', 'B'),
				createItem('a', 'A2'),
			]);

			expect(registry.keys()).toEqual(['a', 'b']);
			expect(registry.get('a')?.metadata.name).toBe('A2');
		});
	});

	describe('Scenario: A registry can refuse a repeated $type', () => {
		it('throws naming the kind and the $type in error mode', () => {
			expect(() =>
				createRegistry('Widget', [createItem('card', 'First'), createItem('card', 'Second')], {
					duplicates: 'error',
				}),
			).toThrow("Widget 'card' is registered twice.");
		});

		it('throws before the schema check, even when the schema is not a Standard Schema', () => {
			const broken = { $type: 'card', metadata: { name: 'Broken' } } as unknown as BaseRegistration;

			expect(() => createRegistry('Widget', [broken, broken], { duplicates: 'error' })).toThrow(
				"Widget 'card' is registered twice.",
			);
		});

		it('builds a list of distinct types in error mode', () => {
			const registry = createRegistry('Widget', [createItem('a', 'A'), createItem('b', 'B')], {
				duplicates: 'error',
			});

			expect(registry.keys()).toEqual(['a', 'b']);
		});

		it('overrides with an explicit override option, like the default', () => {
			const registry = createRegistry('Widget', [createItem('card', 'First'), createItem('card', 'Second')], {
				duplicates: 'override',
			});

			expect(registry.get('card')?.metadata.name).toBe('Second');
			expect(registry.keys()).toEqual(['card']);
		});
	});

	describe('Scenario: The hint option is the hint of the registry as a lookup', () => {
		it('is on the registry and ends the message of an unregistered $type', () => {
			const registry = createRegistry('Widget', [createItem('card', 'Card')], {
				hint: 'Register it in widgets.ts.',
			});

			expect(registry.hint).toBe('Register it in widgets.ts.');
			expect(safeParseNode(registry, { $type: 'missing' })).toMatchObject({
				success: false,
				issues: [{ message: "No registration for $type 'missing'. Register it in widgets.ts." }],
			});
		});

		it('is absent without the option', () => {
			expect(createRegistry('Widget', []).hint).toBeUndefined();
		});
	});

	describe('Scenario: Only the winning registration is checked', () => {
		it('accepts an overridden registration whose schema is not a Standard Schema', () => {
			const broken = { $type: 'card', metadata: { name: 'Broken' } } as unknown as BaseRegistration;

			const registry = createRegistry('Widget', [broken, createItem('card', 'Valid')]);

			expect(registry.get('card')?.metadata.name).toBe('Valid');
		});

		it('rejects a winning registration whose schema is not a Standard Schema', () => {
			const broken = { $type: 'card', metadata: { name: 'Broken' } } as unknown as BaseRegistration;

			expect(() => createRegistry('Widget', [createItem('card', 'Valid'), broken])).toThrow(/Widget 'card'/);
		});
	});

	describe('Scenario: A registration without a Standard Schema is rejected at build', () => {
		it('throws naming the $type and the kind', () => {
			const broken = {
				$type: 'broken',
				schema: { parse: () => undefined },
				metadata: { name: 'Broken' },
			} as unknown as BaseRegistration;

			expect(() => createRegistry('Widget', [createItem('ok', 'Ok'), broken])).toThrow(
				/Widget 'broken' schema must implement Standard Schema/,
			);
		});

		it('rejects a missing schema', () => {
			const broken = { $type: 'missing', metadata: { name: 'Missing' } } as unknown as BaseRegistration;

			expect(() => createRegistry('Widget', [broken])).toThrow(/'missing'/);
		});
	});

	describe('Scenario: The built registry cannot change', () => {
		it('exposes no register or clear method', () => {
			const registry = createRegistry('Widget', [createItem('card', 'Card')]);

			expect(registry).not.toHaveProperty('register');
			expect(registry).not.toHaveProperty('clear');
			expect(Object.isFrozen(registry)).toBe(true);
		});

		it('freezes a copy of each entry and the arrays it returns', () => {
			const item = createItem('card', 'Card');
			const registry = createRegistry('Widget', [item]);

			expect(Object.isFrozen(registry.get('card'))).toBe(true);
			expect(registry.get('card')).not.toBe(item);
			expect(Object.isFrozen(registry.all())).toBe(true);
			expect(Object.isFrozen(registry.keys())).toBe(true);
			expect(() => (registry.all() as BaseRegistration[]).push(createItem('x', 'X'))).toThrow(TypeError);
		});

		it('leaves the registrations it was given unfrozen, spy-able and assignable', () => {
			const item = { ...createItem('card', 'Card'), execute: () => 'ran' };
			const overridden = { ...createItem('card', 'Overridden'), execute: () => 'ran' };

			createRegistry('Widget', [overridden, item]);

			expect(Object.isFrozen(item)).toBe(false);
			expect(Object.isFrozen(overridden)).toBe(false);
			const spy = vi.spyOn(item, 'execute');
			item.execute();
			expect(spy).toHaveBeenCalledTimes(1);
			item.metadata = { name: 'Renamed' };
			expect(item.metadata.name).toBe('Renamed');
		});

		it('is not affected by later changes to the input list', () => {
			const list = [createItem('card', 'Card')];
			const registry = createRegistry('Widget', list);

			list.push(createItem('late', 'Late'));

			expect(registry.has('late')).toBe(false);
			expect(registry.size).toBe(1);
		});
	});

	describe('lookups', () => {
		it('answers get, has, keys and all', () => {
			const card = createItem('card', 'Card');
			const registry = createRegistry('Widget', [card]);

			expect(registry.kind).toBe('Widget');
			expect(registry.has('card')).toBe(true);
			expect(registry.has('nope')).toBe(false);
			expect(registry.get('nope')).toBeUndefined();
			expect(registry.keys()).toEqual(['card']);
			expect(registry.all()).toEqual([card]);
			expect(registry.get('card')).toEqual(card);
		});

		it('builds an empty registry from an empty list', () => {
			const registry = createRegistry('Widget', []);

			expect(registry.size).toBe(0);
			expect(registry.all()).toEqual([]);
		});
	});
});

describe('createRegistry childPaths', () => {
	const layout: BaseRegistration = {
		$type: 'layout',
		schema: z.looseObject({ $type: z.literal('layout') }),
		metadata: { name: 'Layout' },
	};
	const withPaths = (childPaths: unknown) => ({ ...layout, childPaths }) as unknown as BaseRegistration;
	const build = (childPaths: unknown) => () => createRegistry('Widget', [withPaths(childPaths)]);
	const keysMessage = "Widget 'layout' childPaths[0].keys must be a non-empty list of non-empty strings.";
	const acceptsMessage =
		"Widget 'layout' childPaths[0].accepts must be a non-empty list of non-empty $types when present.";
	const entryMessage = "Widget 'layout' childPaths[0] must be an object { keys, accepts?, list? }.";

	it('builds a path as { keys } and as { keys, accepts }', () => {
		const registry = createRegistry('Widget', [
			withPaths([{ keys: ['blocks'] }, { keys: ['engine', 'controls'], accepts: ['knob', 'dial'] }]),
		]);

		expect(registry.get('layout')?.childPaths).toEqual([
			{ keys: ['blocks'] },
			{ keys: ['engine', 'controls'], accepts: ['knob', 'dial'] },
		]);
	});

	it('builds a child path that holds a list', () => {
		const registry = createRegistry('Widget', [
			{ ...layout, childPaths: [{ keys: ['blocks'], accepts: ['block'], list: true }] },
		]);

		expect(registry.get('layout')?.childPaths).toEqual([{ keys: ['blocks'], accepts: ['block'], list: true }]);
	});

	it('builds a registration with no child path', () => {
		expect(createRegistry('Widget', [layout]).get('layout')).not.toHaveProperty('childPaths');
	});

	it.each([
		['a childPaths that is not a list', 'blocks', "Widget 'layout' childPaths must be a list of child paths."],
		['an entry that is a list of keys', [['blocks']], entryMessage],
		['an entry that is a string', ['blocks'], entryMessage],
		['an entry that is null', [null], entryMessage],
		[
			'a property other than keys and accepts, such as accept',
			[{ keys: ['blocks'], accept: ['block'] }],
			"Widget 'layout' childPaths[0] has the property 'accept', which a child path does not have.",
		],
		[
			'a list that is not true',
			[{ keys: ['blocks'], list: false }],
			"Widget 'layout' childPaths[0].list must be true when present.",
		],
		[
			'a list that is a string',
			[{ keys: ['blocks'], list: 'yes' }],
			"Widget 'layout' childPaths[0].list must be true when present.",
		],
		['no keys', [{}], keysMessage],
		['empty keys', [{ keys: [] }], keysMessage],
		['a key that is not a string', [{ keys: [1] }], keysMessage],
		['an empty key', [{ keys: ['blocks', ''] }], keysMessage],
		['an empty accepts', [{ keys: ['blocks'], accepts: [] }], acceptsMessage],
		['an accepts that is not a list', [{ keys: ['blocks'], accepts: 'block' }], acceptsMessage],
		['a name that is not a non-empty string', [{ keys: ['blocks'], accepts: ['block', ''] }], acceptsMessage],
		[
			'a name listed twice',
			[{ keys: ['blocks'], accepts: ['block', 'block'] }],
			"Widget 'layout' childPaths[0].accepts names 'block' twice.",
		],
	])('throws invalid-child-paths for %s', (_name, childPaths, message) => {
		expect(build(childPaths)).toThrow(
			expect.objectContaining({ code: 'invalid-child-paths', kind: 'Widget', $type: 'layout', message }),
		);
	});

	it('throws duplicate-child-path for the same keys twice, whatever accepts says', () => {
		expect(build([{ keys: ['blocks'] }, { keys: ['blocks'], accepts: ['block'] }])).toThrow(
			expect.objectContaining({
				code: 'duplicate-child-path',
				childPath: ['blocks'],
				message: "Widget 'layout' declares the child path 'blocks' twice.",
			}),
		);
	});

	it('throws nested-child-path for a path that runs through another, in either order', () => {
		const message = "Widget 'layout' child path 'engine.controls' runs through the child path 'engine'.";

		expect(build([{ keys: ['engine'] }, { keys: ['engine', 'controls'] }])).toThrow(
			expect.objectContaining({
				code: 'nested-child-path',
				childPath: ['engine', 'controls'],
				outerChildPath: ['engine'],
				message,
			}),
		);
		expect(build([{ keys: ['engine', 'controls'] }, { keys: ['engine'] }])).toThrow(message);
	});

	it('builds paths that share a first key without one running through the other', () => {
		expect(build([{ keys: ['engine', 'controls'] }, { keys: ['engine', 'meters'] }])).not.toThrow();
	});

	it('compares paths key by key, so [a.b] and [a, b] are two paths', () => {
		expect(build([{ keys: ['a.b'] }, { keys: ['a', 'b'] }])).not.toThrow();
	});
});

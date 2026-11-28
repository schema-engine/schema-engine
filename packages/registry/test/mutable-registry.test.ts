import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import * as z from 'zod/mini';
import {
	createMutableRegistry,
	createRegistry,
	exportTreeSchema,
	RegistryError,
	safeParseNode,
	safeParseTree,
	type BaseRegistration,
	type ReadOnlyRegistry,
} from '../src';
import * as entry from '../src';

const mockSchema = z.object({ $type: z.string(), test: z.optional(z.string()) });

const createMockItem = (id: string, name: string): BaseRegistration => ({
	$type: id,
	schema: mockSchema,
	metadata: { name, description: 'Test Description' },
});

const build = () => createMutableRegistry<BaseRegistration>('Plugin');

describe('createMutableRegistry', () => {
	describe('Scenario: A mutable registry has the read side of a createRegistry result', () => {
		it('answers get, has, all, keys, size and kind', () => {
			const registry = build();
			registry.register(createMockItem('a', 'A'));
			registry.register(createMockItem('b', 'B'));
			const readable: ReadOnlyRegistry = registry;

			expect(readable.keys()).toEqual(['a', 'b']);
			expect(readable.all().map((item) => item.$type)).toEqual(['a', 'b']);
			expect(readable.kind).toBe('Plugin');
			expect(readable.size).toBe(2);
			expect(readable.has('a')).toBe(true);
			expect(readable.has('missing')).toBe(false);
			expect(readable.get('missing')).toBeUndefined();
			expect(Object.isFrozen(readable.all())).toBe(true);
			expect(Object.isFrozen(readable.keys())).toBe(true);
		});

		it('is accepted by safeParseNode, safeParseTree and exportTreeSchema', () => {
			const registry = build();
			registry.register(createMockItem('a', 'A'));

			expect(safeParseNode(registry, { $type: 'a' }).success).toBe(true);
			expect(safeParseTree(registry, { $type: 'a' }).success).toBe(true);
			expect(Object.keys(exportTreeSchema(registry).$defs as object)).toEqual(['a']);
		});

		it('returns a frozen shallow copy taken at register', () => {
			const registry = build();
			const item = createMockItem('a', 'A');
			registry.register(item);

			expect(registry.get('a')).not.toBe(item);
			expect(registry.get('a')).toEqual(item);
			expect(Object.isFrozen(registry.get('a'))).toBe(true);
			expect(registry.get('a')?.schema).toBe(item.schema);
		});
	});

	describe('Scenario: all() is stable between changes', () => {
		it('returns the same arrays until the next register or clear', () => {
			const registry = build();
			registry.register(createMockItem('a', 'A'));
			const all = registry.all();
			const keys = registry.keys();

			expect(registry.all()).toBe(all);
			expect(registry.keys()).toBe(keys);

			registry.register(createMockItem('b', 'B'));

			expect(registry.all()).not.toBe(all);
			expect(registry.keys()).not.toBe(keys);
			expect(all.map((item) => item.$type)).toEqual(['a']);
			expect(keys).toEqual(['a']);

			const afterRegister = registry.all();
			registry.clear();

			expect(registry.all()).not.toBe(afterRegister);
			expect(registry.all()).toEqual([]);
			expect(afterRegister).toHaveLength(2);
		});
	});

	describe('Scenario: A repeated $type keeps its first position', () => {
		it('replaces the registration and logs nothing', () => {
			const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
			const registry = build();
			registry.register(createMockItem('a', 'First'));
			registry.register(createMockItem('b', 'B'));
			registry.register(createMockItem('a', 'Second'));

			expect(registry.keys()).toEqual(['a', 'b']);
			expect(registry.size).toBe(2);
			expect(registry.get('a')?.metadata.name).toBe('Second');
			expect(warn).not.toHaveBeenCalled();
			warn.mockRestore();
		});
	});

	describe("Scenario: duplicates 'error'", () => {
		it('throws duplicate-type and keeps the first registration', () => {
			const registry = createMutableRegistry<BaseRegistration>('Plugin', { duplicates: 'error' });
			registry.register(createMockItem('a', 'First'));

			expect(() => registry.register(createMockItem('a', 'Second'))).toThrow(
				expect.objectContaining({
					code: 'duplicate-type',
					kind: 'Plugin',
					$type: 'a',
					message: "Plugin 'a' is registered twice.",
				}),
			);
			expect(registry.get('a')?.metadata.name).toBe('First');
			expect(registry.size).toBe(1);
		});
	});

	describe('Scenario: register checks the schema', () => {
		it('throws invalid-schema with the message createRegistry gives, and leaves the registry unchanged', () => {
			const registry = build();
			registry.register(createMockItem('ok', 'Ok'));
			const broken = {
				$type: 'broken',
				schema: { parse: () => undefined },
				metadata: { name: 'Broken' },
			} as unknown as BaseRegistration;

			expect(() => registry.register(broken)).toThrow(
				expect.objectContaining({
					code: 'invalid-schema',
					kind: 'Plugin',
					$type: 'broken',
					message: "Plugin 'broken' schema must implement Standard Schema (~standard.validate).",
				}),
			);
			expect(() => createRegistry('Plugin', [broken])).toThrow(
				"Plugin 'broken' schema must implement Standard Schema (~standard.validate).",
			);
			expect(registry.size).toBe(1);
			expect(registry.has('broken')).toBe(false);
		});

		it('leaves an earlier registration of the same $type in place when the new one is invalid', () => {
			const registry = build();
			const first = createMockItem('a', 'First');
			registry.register(first);

			expect(() => registry.register({ ...first, schema: {} as unknown as BaseRegistration['schema'] })).toThrow(
				RegistryError,
			);
			expect(registry.get('a')?.metadata.name).toBe('First');
		});
	});

	describe('Scenario: register checks child paths', () => {
		it.each([
			['a childPaths that is not a list', 'blocks', 'invalid-child-paths'],
			[
				'a property other than keys and accepts',
				[{ keys: ['blocks'], accept: ['block'] }],
				'invalid-child-paths',
			],
			['an empty accepts', [{ keys: ['blocks'], accepts: [] }], 'invalid-child-paths'],
			['a repeated path', [{ keys: ['blocks'] }, { keys: ['blocks'] }], 'duplicate-child-path'],
			['a nested path', [{ keys: ['blocks'] }, { keys: ['blocks', 'more'] }], 'nested-child-path'],
		])('throws for %s with the code and message createRegistry gives', (_name, childPaths, code) => {
			const registration = {
				...createMockItem('layout', 'Layout'),
				childPaths,
			} as unknown as BaseRegistration;
			const registry = build();
			let fromCreateRegistry: unknown;
			try {
				createRegistry('Plugin', [registration]);
			} catch (error) {
				fromCreateRegistry = error;
			}

			expect(fromCreateRegistry).toMatchObject({ code });
			expect(() => registry.register(registration)).toThrow(
				expect.objectContaining({
					code,
					kind: 'Plugin',
					$type: 'layout',
					message: (fromCreateRegistry as Error).message,
				}),
			);
			expect(registry.size).toBe(0);
		});

		it('accepts a name that is not registered yet', () => {
			const registry = build();

			expect(() =>
				registry.register({
					$type: 'layout',
					schema: z.object({ $type: z.literal('layout'), blocks: z.array(z.unknown()) }),
					metadata: { name: 'Layout' },
					childPaths: [{ keys: ['blocks'], accepts: ['block'] }],
				}),
			).not.toThrow();
		});
	});

	describe('Scenario: The registry package has no logger', () => {
		it('lists no @ecopages/logger dependency', () => {
			const manifest = JSON.parse(
				readFileSync(join(resolve(import.meta.dirname, '..'), 'package.json'), 'utf8'),
			) as {
				dependencies: Record<string, string>;
			};

			expect(manifest.dependencies).not.toHaveProperty('@ecopages/logger');
		});

		it('exports no BaseRegistry', () => {
			expect(entry).not.toHaveProperty('BaseRegistry');
			expect(entry).toHaveProperty('createMutableRegistry');
		});
	});
});

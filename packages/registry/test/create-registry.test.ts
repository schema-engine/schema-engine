import { afterEach, describe, expect, it, vi } from 'vitest';
import * as z from 'zod/mini';
import { createRegistry, type BaseRegistration } from '../src';

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

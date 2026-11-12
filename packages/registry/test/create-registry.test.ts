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

			expect(registry.get('card')).toBe(second);
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

	describe('Scenario: A registration without a Standard Schema is rejected at build', () => {
		it('throws naming the $type and the kind', () => {
			const broken = { $type: 'broken', schema: { parse: () => undefined }, metadata: { name: 'Broken' } };

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

		it('freezes its entries and the arrays it returns', () => {
			const item = createItem('card', 'Card');
			const registry = createRegistry('Widget', [item]);

			expect(Object.isFrozen(registry.get('card'))).toBe(true);
			expect(Object.isFrozen(registry.all())).toBe(true);
			expect(Object.isFrozen(registry.keys())).toBe(true);
			expect(() => (registry.all() as BaseRegistration[]).push(createItem('x', 'X'))).toThrow(TypeError);
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
		});

		it('builds an empty registry from an empty list', () => {
			const registry = createRegistry('Widget', []);

			expect(registry.size).toBe(0);
			expect(registry.all()).toEqual([]);
		});
	});
});

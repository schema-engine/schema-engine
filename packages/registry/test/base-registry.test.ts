import { describe, expect, it, beforeEach } from 'vitest';
import * as z from 'zod/mini';
import { BaseRegistry, type BaseRegistration, type ReadOnlyRegistry } from '../src';

class TestRegistry extends BaseRegistry<BaseRegistration> {
	readonly kind = 'TestRegistry';
}

const mockSchema = z.object({
	test: z.string(),
});

const createMockItem = (id: string, name: string): BaseRegistration => ({
	$type: id,
	schema: mockSchema,
	metadata: {
		name,
		description: 'Test Description',
	},
});

describe('BaseRegistry', () => {
	let registry: TestRegistry;

	beforeEach(() => {
		registry = new TestRegistry();
	});

	it('should register and retrieve an item', () => {
		const item = createMockItem('item1', 'Item 1');
		registry.register(item);

		expect(registry.has('item1')).toBe(true);
		expect(registry.get('item1')).toBe(item);
	});

	it('should return undefined for non-existent item', () => {
		expect(registry.get('non-existent')).toBeUndefined();
	});

	it('should return all registered items', () => {
		const item1 = createMockItem('item1', 'Item 1');
		const item2 = createMockItem('item2', 'Item 2');

		registry.register(item1);
		registry.register(item2);

		expect(registry.all()).toEqual([item1, item2]);
	});

	it('should return all registered keys', () => {
		const item1 = createMockItem('item1', 'Item 1');
		const item2 = createMockItem('item2', 'Item 2');

		registry.register(item1);
		registry.register(item2);

		expect(registry.keys()).toEqual(['item1', 'item2']);
	});

	it('returns frozen arrays that a later registration does not change', () => {
		registry.register(createMockItem('item1', 'Item 1'));
		const all = registry.all();
		const keys = registry.keys();
		registry.register(createMockItem('item2', 'Item 2'));

		expect(Object.isFrozen(all)).toBe(true);
		expect(Object.isFrozen(keys)).toBe(true);
		expect(all).toHaveLength(1);
		expect(keys).toEqual(['item1']);
	});

	it('keeps the first position of an overridden key, like createRegistry', () => {
		registry.register(createMockItem('item1', 'Item 1'));
		registry.register(createMockItem('item2', 'Item 2'));
		registry.register(createMockItem('item1', 'Item 1 Updated'));

		expect(registry.keys()).toEqual(['item1', 'item2']);
		expect(registry.all().map((item) => item.metadata.name)).toEqual(['Item 1 Updated', 'Item 2']);
	});

	it('is a ReadOnlyRegistry with the kind its subclass names', () => {
		const readable: ReadOnlyRegistry = registry;

		expect(readable.kind).toBe('TestRegistry');
	});

	it('should return correct size', () => {
		expect(registry.size).toBe(0);
		registry.register(createMockItem('item1', 'Item 1'));
		expect(registry.size).toBe(1);
	});

	it('should clear registry', () => {
		registry.register(createMockItem('item1', 'Item 1'));
		registry.clear();
		expect(registry.size).toBe(0);
		expect(registry.has('item1')).toBe(false);
	});

	it('should handle overriding registration', () => {
		const item1 = createMockItem('item1', 'Item 1');
		const item1Override = createMockItem('item1', 'Item 1 Updated');

		registry.register(item1);
		registry.register(item1Override);

		expect(registry.size).toBe(1);
		expect(registry.get('item1')).toBe(item1Override);
		expect(registry.get('item1')?.metadata.name).toBe('Item 1 Updated');
	});
});

import { describe, expect, it, beforeEach } from 'vitest';
import * as z from 'zod/mini';
import { BaseRegistry, type BaseRegistration } from '../src';

class TestRegistry extends BaseRegistry<string, BaseRegistration> {
	get registryName(): string {
		return 'TestRegistry';
	}
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

		const all = registry.getAll();
		expect(all).toHaveLength(2);
		expect(all).toContain(item1);
		expect(all).toContain(item2);
	});

	it('should return all registered keys', () => {
		const item1 = createMockItem('item1', 'Item 1');
		const item2 = createMockItem('item2', 'Item 2');

		registry.register(item1);
		registry.register(item2);

		const keys = registry.getAllKeys();
		expect(keys).toHaveLength(2);
		expect(keys).toContain('item1');
		expect(keys).toContain('item2');
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

	it('should allow direct map access via getMap', () => {
		const item = createMockItem('item1', 'Item 1');
		registry.register(item);

		const map = registry.getMap();
		expect(map).toBeInstanceOf(Map);
		expect(map.get('item1')).toBe(item);
	});
});

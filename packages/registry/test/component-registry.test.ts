import { describe, expect, it } from 'bun:test';
import { z } from 'zod';
import { ComponentRegistry, type ComponentRegistration } from '../src';

class TestComponentRegistry extends ComponentRegistry<string, ComponentRegistration> {
	get registryName(): string {
		return 'TestComponentRegistry';
	}
}

const mockSchema = z.object({
	test: z.string(),
});

const createMockComponent = (id: string, name: string): ComponentRegistration => ({
	$type: id,
	render: () => 'rendered',
	schema: mockSchema,
	metadata: {
		name,
		description: 'Test Description',
	},
});

describe('ComponentRegistry', () => {
	it('should enforce ComponentRegistration type', () => {
		const registry = new TestComponentRegistry();
		const component = createMockComponent('comp1', 'Component 1');

		registry.register(component);
		expect(registry.get('comp1')).toBe(component);
		expect(typeof registry.get('comp1')?.render).toBe('function');
	});
});

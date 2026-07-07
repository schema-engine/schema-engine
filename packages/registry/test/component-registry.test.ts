import { describe, expect, it, beforeEach } from 'bun:test';
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
	let registry: TestComponentRegistry;

	beforeEach(() => {
		registry = new TestComponentRegistry();
	});

	it('should enforce ComponentRegistration type', () => {
		const component = createMockComponent('comp1', 'Component 1');

		registry.register(component);
		expect(registry.get('comp1')).toBe(component);
		expect(typeof registry.get('comp1')?.render).toBe('function');
	});

	it('should inherit BaseRegistry retrieval and lifecycle behavior', () => {
		const componentA = createMockComponent('comp-a', 'Component A');
		const componentB = createMockComponent('comp-b', 'Component B');

		registry.register(componentA);
		registry.register(componentB);

		expect(registry.size).toBe(2);
		expect(registry.getAll()).toEqual([componentA, componentB]);
		expect(registry.getAllKeys()).toEqual(['comp-a', 'comp-b']);

		registry.clear();

		expect(registry.size).toBe(0);
		expect(registry.has('comp-a')).toBe(false);
	});

	it('should invoke render with provided props', () => {
		type InputProps = { label: string; value: string };
		const props: InputProps = { label: 'Email', value: 'test@example.com' };
		let receivedProps: InputProps | undefined;

		registry.register({
			$type: 'input',
			schema: mockSchema,
			metadata: { name: 'Input' },
			render: (renderProps: InputProps) => {
				receivedProps = renderProps;
				return 'rendered-input';
			},
		});

		const component = registry.get('input');
		const output = component?.render(props);

		expect(output).toBe('rendered-input');
		expect(receivedProps).toEqual(props);
	});

	it('should preserve component metadata on registration', () => {
		const component: ComponentRegistration = {
			$type: 'card',
			render: () => 'card',
			schema: mockSchema,
			metadata: {
				name: 'Card',
				description: 'Layout card',
				icon: 'layout',
				tags: ['layout', 'container'],
				version: '1.0.0',
			},
		};

		registry.register(component);

		expect(registry.get('card')?.metadata).toEqual(component.metadata);
	});
});

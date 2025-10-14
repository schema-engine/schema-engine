import { describe, test, expect, beforeEach } from 'bun:test';
import { ElementRegistry } from '@/registries';
import type { ElementRegistration } from '@/types';
import { z } from 'zod';

describe('ElementRegistry', () => {
	let registry: ElementRegistry;

	const mockElement: ElementRegistration<{ label: string }, any> = {
		__id: 'text-input',
		schema: z.object({ label: z.string() }),
		metadata: {
			name: 'Text Input',
			description: 'A text input field',
			category: 'input',
		},
		render: (props) => props,
	};

	const anotherElement: ElementRegistration<{ placeholder: string }, any> = {
		__id: 'email-input',
		schema: z.object({ placeholder: z.string() }),
		metadata: {
			name: 'Email Input',
			description: 'An email input field',
			category: 'input',
		},
		render: (props) => props,
	};

	beforeEach(() => {
		registry = new ElementRegistry();
	});

	describe('register', () => {
		test('should register an element', () => {
			registry.register(mockElement);

			expect(registry.has('text-input')).toBe(true);
			expect(registry.get('text-input')).toEqual(mockElement);
		});

		test('should allow registering multiple elements', () => {
			registry.register(mockElement);
			registry.register(anotherElement);

			expect(registry.size).toBe(2);
			expect(registry.has('text-input')).toBe(true);
			expect(registry.has('email-input')).toBe(true);
		});

		test('should override when registering duplicate id', () => {
			const updated: ElementRegistration = {
				...mockElement,
				metadata: {
					...mockElement.metadata,
					name: 'Updated Text Input',
				},
			};

			registry.register(mockElement);
			registry.register(updated);

			expect(registry.size).toBe(1);
			expect(registry.get('text-input')?.metadata.name).toBe('Updated Text Input');
		});
	});

	describe('has', () => {
		test('should return true for registered element', () => {
			registry.register(mockElement);
			expect(registry.has('text-input')).toBe(true);
		});

		test('should return false for unregistered element', () => {
			expect(registry.has('non-existent')).toBe(false);
		});
	});

	describe('get', () => {
		test('should retrieve registered element', () => {
			registry.register(mockElement);
			const retrieved = registry.get('text-input');

			expect(retrieved).toEqual(mockElement);
		});

		test('should return undefined for unregistered element', () => {
			const retrieved = registry.get('non-existent');
			expect(retrieved).toBeUndefined();
		});
	});

	describe('getAll', () => {
		test('should return empty array when no elements registered', () => {
			expect(registry.getAll()).toEqual([]);
		});

		test('should return all registered elements', () => {
			registry.register(mockElement);
			registry.register(anotherElement);

			const all = registry.getAll();
			expect(all).toHaveLength(2);
			expect(all).toContain(mockElement);
			expect(all).toContain(anotherElement);
		});
	});

	describe('getAllKeys', () => {
		test('should return empty array when no elements registered', () => {
			expect(registry.getAllKeys()).toEqual([]);
		});

		test('should return all registered ids', () => {
			registry.register(mockElement);
			registry.register(anotherElement);

			const keys = registry.getAllKeys();
			expect(keys).toHaveLength(2);
			expect(keys).toContain('text-input');
			expect(keys).toContain('email-input');
		});
	});

	describe('size', () => {
		test('should return 0 for empty registry', () => {
			expect(registry.size).toBe(0);
		});

		test('should return correct count', () => {
			registry.register(mockElement);
			expect(registry.size).toBe(1);

			registry.register(anotherElement);
			expect(registry.size).toBe(2);
		});
	});

	describe('clear', () => {
		test('should remove all elements', () => {
			registry.register(mockElement);
			registry.register(anotherElement);
			expect(registry.size).toBe(2);

			registry.clear();

			expect(registry.size).toBe(0);
			expect(registry.has('text-input')).toBe(false);
			expect(registry.has('email-input')).toBe(false);
		});
	});

	describe('registryName', () => {
		test('should return correct registry name', () => {
			expect(registry.registryName).toBe('element');
		});
	});
});

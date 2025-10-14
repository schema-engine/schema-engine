import { describe, test, expect, beforeEach } from 'bun:test';
import { LayoutRegistry } from '@/registries';
import type { LayoutRegistration } from '@/types';
import { z } from 'zod';

describe('LayoutRegistry', () => {
	let registry: LayoutRegistry;

	const mockLayout: LayoutRegistration<{ theme: string }, any> = {
		__id: 'card-layout',
		schema: z.object({ theme: z.string() }),
		metadata: {
			name: 'Card Layout',
			description: 'A card-based layout',
		},
		render: (props) => props,
	};

	const anotherLayout: LayoutRegistration<{ width: number }, any> = {
		__id: 'full-width-layout',
		schema: z.object({ width: z.number() }),
		metadata: {
			name: 'Full Width Layout',
			description: 'A full-width layout',
		},
		render: (props) => props,
	};

	beforeEach(() => {
		registry = new LayoutRegistry();
	});

	describe('register', () => {
		test('should register a layout', () => {
			registry.register(mockLayout);

			expect(registry.has('card-layout')).toBe(true);
			expect(registry.get('card-layout')).toEqual(mockLayout);
		});

		test('should allow registering multiple layouts', () => {
			registry.register(mockLayout);
			registry.register(anotherLayout);

			expect(registry.size).toBe(2);
		});
	});

	describe('get', () => {
		test('should retrieve registered layout', () => {
			registry.register(mockLayout);
			expect(registry.get('card-layout')).toEqual(mockLayout);
		});

		test('should return undefined for unregistered layout', () => {
			expect(registry.get('non-existent')).toBeUndefined();
		});
	});

	describe('registryName', () => {
		test('should return correct registry name', () => {
			expect(registry.registryName).toBe('layout');
		});
	});
});

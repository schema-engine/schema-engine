/**
 * Compile-time type safety tests for form field extensibility
 * These tests verify that TypeScript provides proper type checking and IntelliSense
 * for custom field types and array elements
 */

import { test, expect, describe } from 'bun:test';
import type { ArrayElementsConfig } from '@/lib/form-engine/components/form/fields/form-array-elements.types';

import '@/lib/form-engine/components/form/fields/form-input.registry';
import '@/lib/form-engine/components/form/fields/form-textarea.registry';
import '@/lib/form-engine/components/form/fields/form-select.registry';
import '@/lib/form-engine/components/form/fields/form-array-elements.registry';

describe('Compile-Time Type Safety', () => {
	test('should provide type safety for array elements configuration', () => {
		const arrayConfig: ArrayElementsConfig = {
			componentId: 'arrayElements',
			id: 'testArray',
			name: 'testArray',
			label: 'Test Array',
			elements: [
				{
					componentId: 'input',
					id: 'name',
					name: 'name',
					label: 'Name',
					inputType: 'text', 
				},
				{
					componentId: 'select',
					id: 'category',
					name: 'category',
					label: 'Category',
					options: [
						{ value: 'a', label: 'Option A' },
						{ value: 'b', label: 'Option B' },
					],
				},
			],
		};

		expect(arrayConfig.elements).toHaveLength(2);
		expect(arrayConfig.elements[0].componentId).toBe('input');
		expect(arrayConfig.elements[1].componentId).toBe('select');
	});

	test('should provide discriminated union type checking', () => {
		const elements: ArrayElementsConfig['elements'] = [
			{
				componentId: 'input',
				id: 'text',
				name: 'text',
				inputType: 'email', 
			},
			{
				componentId: 'select',
				id: 'dropdown',
				name: 'dropdown',
				options: [
					{ value: 'a', label: 'Option A' },
					{ value: 'b', label: 'Option B' },
				],
			},
		];

		for (const element of elements) {
			if (element.componentId === 'input') {
				expect(typeof element.inputType).toBe('string');
			} else if (element.componentId === 'select') {
				expect(Array.isArray(element.options)).toBe(true);
			}
		}
	});

	test('should provide type-safe field configuration access', () => {
		const elements: ArrayElementsConfig['elements'] = [
			{
				componentId: 'input',
				id: 'email',
				name: 'email',
				inputType: 'email',
				autoComplete: 'email',
				spellCheck: false,
			},
			{
				componentId: 'textarea',
				id: 'description',
				name: 'description',
				rows: 4,
				resize: 'vertical',
			},
			{
				componentId: 'checkbox',
				id: 'agree',
				name: 'agree',
			},
		];

		for (const element of elements) {
			switch (element.componentId) {
				case 'input':
					expect(typeof element.inputType).toBe('string');
					if ('autoComplete' in element) {
						expect(typeof element.autoComplete).toBe('string');
					}
					break;

				case 'textarea':
					if ('rows' in element) {
						expect(typeof element.rows).toBe('number');
					}
					break;

				case 'checkbox':
					expect(element.componentId).toBe('checkbox');
					break;

				default:
					expect(typeof element.componentId).toBe('string');
					break;
			}
		}
	});

	test('should maintain type safety across nested structures', () => {
		const complexArray: ArrayElementsConfig = {
			componentId: 'arrayElements',
			id: 'products',
			name: 'products',
			label: 'Products',
			description: 'Add your products',
			elements: [
				{
					componentId: 'input',
					id: 'productName',
					name: 'name',
					label: 'Product Name',
					inputType: 'text',
					placeholder: 'Enter product name...',
				},
				{
					componentId: 'select',
					id: 'category',
					name: 'category',
					label: 'Category',
					options: [
						{ value: 'electronics', label: 'Electronics' },
						{ value: 'clothing', label: 'Clothing' },
						{ value: 'books', label: 'Books' },
					],
				},
				{
					componentId: 'number',
					id: 'price',
					name: 'price',
					label: 'Price',
					min: 0,
					step: 0.01,
				},
			],
			minItems: 1,
			maxItems: 50,
			addButtonText: 'Add Product',
			removeButtonText: 'Remove Product',
		};

		expect(complexArray.elements[0].componentId).toBe('input');
		expect(complexArray.elements[1].componentId).toBe('select');
		expect(complexArray.elements[2].componentId).toBe('number');

		const inputElement = complexArray.elements[0];
		if (inputElement.componentId === 'input') {
			expect(inputElement.inputType).toBe('text');
			expect(inputElement.placeholder).toBe('Enter product name...');
		}

		const selectElement = complexArray.elements[1];
		if (selectElement.componentId === 'select') {
			expect(selectElement.options).toHaveLength(3);
			expect(selectElement.options![0].value).toBe('electronics');
		}

		const numberElement = complexArray.elements[2];
		if (numberElement.componentId === 'number') {
			expect(numberElement.min).toBe(0);
			expect(numberElement.step).toBe(0.01);
		}
	});
});
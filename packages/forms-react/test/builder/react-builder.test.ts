/**
 * Tests for React Form Engine factory
 */

import { describe, test, expect } from 'vitest';
import { createFormEngine } from '@schema-engine/forms';
import { InputElementRegistration } from '@/components/schema-engine/forms/inputs/form-input.registration';
import { FormTextarea } from '@/components/schema-engine/forms/inputs/form-textarea';
import { CardRecipe } from '@/components/schema-engine/forms/recipes/registrations';
import { InputFieldSchema } from '@/components/schema-engine/forms/inputs/form-input.types';
import { TextareaFieldSchema } from '@/components/schema-engine/forms/inputs/form-textarea.types';
import { anyValue } from '../utils/any-value';

describe('React Form Engine factory', () => {
	describe('Engine creation', () => {
		test('should create a new headless engine instance', () => {
			const engine = createFormEngine();
			expect(typeof engine.defineForm).toBe('function');
			expect(typeof engine.validateForm).toBe('function');
			expect(typeof engine.extend).toBe('function');
		});
	});

	describe('Element registration', () => {
		test('should register input element', () => {
			const engine = createFormEngine({ elements: [InputElementRegistration] });

			expect(engine.hasElement('input')).toBe(true);
			const element = engine.getElement('input');
			expect(element?.$type).toBe('input');
		});

		test('should register multiple elements', () => {
			const textareaElement = {
				$type: 'textarea',
				kind: 'input' as const,
				value: anyValue,
				render: FormTextarea,
				schema: TextareaFieldSchema,
				metadata: {
					name: 'Textarea Field',
					description: 'Multi-line text input',
					category: 'input',
				},
			};

			const engine = createFormEngine({
				elements: [InputElementRegistration, textareaElement],
			});

			expect(engine.hasElement('input')).toBe(true);
			expect(engine.hasElement('textarea')).toBe(true);

			const elementIds = engine.getElementIds();
			expect(elementIds).toContain('input');
			expect(elementIds).toContain('textarea');
		});

		test('should include element schema', () => {
			const engine = createFormEngine({ elements: [InputElementRegistration] });
			const element = engine.getElement('input');

			expect(element?.schema).toBe(InputFieldSchema);
		});

		test('should include element metadata', () => {
			const engine = createFormEngine({ elements: [InputElementRegistration] });
			const element = engine.getElement('input');

			expect(element?.metadata.name).toBe('Text Input Field');
			expect(element?.metadata.category).toBe('input');
		});
	});

	describe('Recipe registration', () => {
		test('registers recipes only when explicitly added', () => {
			const engine = createFormEngine();

			expect(engine.getRecipeIds()).toEqual([]);
			const recipeEngine = createFormEngine({ recipes: [CardRecipe] });
			expect(recipeEngine.getRecipe('card')?.metadata.name).toBe(CardRecipe.metadata.name);
		});
	});

	describe('Engine extend', () => {
		test('should extend an engine with additional registrations', () => {
			const base = createFormEngine({ elements: [InputElementRegistration] });
			const extended = base.extend({
				elements: [
					{
						$type: 'textarea',
						kind: 'input',
						value: anyValue,
						render: FormTextarea,
						schema: TextareaFieldSchema,
						metadata: {
							name: 'Textarea Field',
							description: 'Multi-line text input',
							category: 'input',
						},
					},
				],
			});

			expect(extended.hasElement('input')).toBe(true);
			expect(extended.hasElement('textarea')).toBe(true);
		});
	});

	describe('Engine summary', () => {
		test('should build engine summary', () => {
			const engine = createFormEngine({ elements: [InputElementRegistration] });
			const summary = engine.getSummary();

			expect(summary.elements.count).toBe(1);
			expect(summary.recipes.count).toBe(0);
		});

		test('should allow building a headless engine with no registrations', () => {
			const engine = createFormEngine();

			expect(engine.getElementIds()).toEqual([]);
			expect(engine.getActionTypes()).toEqual([]);
			expect(engine.getRecipeIds()).toEqual([]);
			const summary = engine.getSummary();
			expect(summary.elements.count).toBe(0);
			expect(summary.actions.count).toBe(0);
			expect(summary.recipes.count).toBe(0);
		});
	});

	describe('Engine retrieval', () => {
		test('should retrieve all elements', () => {
			const textareaElement = {
				$type: 'textarea',
				kind: 'input' as const,
				value: anyValue,
				render: FormTextarea,
				schema: TextareaFieldSchema,
				metadata: {
					name: 'Textarea Field',
					description: 'Multi-line text input',
					category: 'input',
				},
			};

			const engine = createFormEngine({
				elements: [InputElementRegistration, textareaElement],
			});
			const elements = engine.getAllElements();

			expect(elements.map((element) => element.$type).sort()).toEqual(['input', 'textarea']);
		});

		test('should return undefined for non-existent element', () => {
			const engine = createFormEngine();

			expect(engine.getElement('nonexistent')).toBeUndefined();
			expect(engine.hasElement('nonexistent')).toBe(false);
		});
	});

	describe('Type safety', () => {
		test('should maintain type safety through registration objects', () => {
			const elementReg = InputElementRegistration;

			expect(elementReg.$type).toBe('input');
			expect(typeof elementReg.render).toBe('function');
		});

		test('should convert React component to render function', () => {
			const elementReg = InputElementRegistration;

			expect(typeof elementReg.render).toBe('function');
		});
	});

	describe('Integration', () => {
		test('should create a fully configured form engine', () => {
			const engine = createFormEngine({ elements: [InputElementRegistration] });

			expect(engine.hasElement('input')).toBe(true);
			expect(engine.getRecipeIds()).toEqual([]);

			const element = engine.getElement('input');
			expect(element?.$type).toBe('input');
			expect(element?.schema).toBe(InputFieldSchema);
			expect(element?.metadata.name).toBe('Text Input Field');
		});
	});
});

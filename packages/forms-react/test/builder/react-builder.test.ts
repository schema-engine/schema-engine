/**
 * Tests for React Form Engine Builder Pattern
 */

import { describe, test, expect } from 'vitest';
import { createReactFormComposer } from '@/registries/builder-registry';
import { InputElementRegistration } from '@/components/schema-engine/forms/inputs/form-input.registration';
import { FormTextarea } from '@/components/schema-engine/forms/inputs/form-textarea';
import { CardRecipe } from '@/components/schema-engine/forms/recipes/registrations';
import { InputFieldSchema } from '@/components/schema-engine/forms/inputs/form-input.types';
import { TextareaFieldSchema } from '@/components/schema-engine/forms/inputs/form-textarea.types';

describe('React Form Engine Builder', () => {
	describe('Builder Creation', () => {
		test('should create a new headless builder instance', () => {
			const builder = createReactFormComposer();
			expect(typeof builder.addElement).toBe('function');
			expect(typeof builder.addRecipe).toBe('function');
			expect(typeof builder.build).toBe('function');
		});
	});

	describe('Element Registration', () => {
		test('should register input element', () => {
			const builder = createReactFormComposer();
			const elementReg = InputElementRegistration;

			builder.addElement(elementReg);
			const engine = builder.build();

			expect(engine.hasElement('input')).toBe(true);
			const element = engine.getElement('input');
			expect(element?.$type).toBe('input');
		});

		test('should register multiple elements', () => {
			const textareaElement = {
				$type: 'textarea',
				render: FormTextarea,
				schema: TextareaFieldSchema,
				metadata: {
					name: 'Textarea Field',
					description: 'Multi-line text input',
					category: 'input' as const,
				},
			};

			const builder = createReactFormComposer();
			builder.addElement(InputElementRegistration).addElement(textareaElement);

			const engine = builder.build();

			expect(engine.hasElement('input')).toBe(true);
			expect(engine.hasElement('textarea')).toBe(true);

			const elementIds = engine.getElementIds();
			expect(elementIds).toContain('input');
			expect(elementIds).toContain('textarea');
		});

		test('should include element schema', () => {
			const builder = createReactFormComposer();
			builder.addElement(InputElementRegistration);

			const engine = builder.build();
			const element = engine.getElement('input');

			expect(element?.schema).toBe(InputFieldSchema);
		});

		test('should include element metadata', () => {
			const builder = createReactFormComposer();
			builder.addElement(InputElementRegistration);

			const engine = builder.build();
			const element = engine.getElement('input');

			expect(element?.metadata.name).toBe('Text Input Field');
			expect(element?.metadata.category).toBe('input');
		});
	});

	describe('Recipe Registration', () => {
		test('registers recipes only when explicitly added', () => {
			const engine = createReactFormComposer().build();

			expect(engine.getRecipeIds()).toEqual([]);
			const recipeEngine = createReactFormComposer().addRecipe(CardRecipe).build();
			expect(recipeEngine.getRecipe('card')?.metadata.name).toBe(CardRecipe.metadata.name);
		});
	});

	describe('Method Chaining', () => {
		test('should support fluent API', () => {
			const engine = createReactFormComposer().addElement(InputElementRegistration).build();

			expect(engine.hasElement('input')).toBe(true);
			expect(engine.getRecipeIds()).toEqual([]);
		});
	});

	describe('Engine Build', () => {
		test('should build engine with registrations', () => {
			const builder = createReactFormComposer();
			builder.addElement(InputElementRegistration);

			const engine = builder.build();

			expect(engine.hasElement('input')).toBe(true);
		});

		test('should build engine summary', () => {
			const engine = createReactFormComposer().addElement(InputElementRegistration).build();
			const summary = engine.getSummary();

			expect(summary.elements.count).toBe(1);
			expect(summary.recipes.count).toBe(0);
		});

		test('should allow building a headless engine with no registrations', () => {
			const engine = createReactFormComposer().build();

			expect(engine.getElementIds()).toEqual([]);
			expect(engine.getActionTypes()).toEqual([]);
			expect(engine.getRecipeIds()).toEqual([]);
			const summary = engine.getSummary();
			expect(summary.elements.count).toBe(0);
			expect(summary.actions.count).toBe(0);
			expect(summary.recipes.count).toBe(0);
		});
	});

	describe('Engine Retrieval', () => {
		test('should retrieve all elements', () => {
			const textareaElement = {
				$type: 'textarea',
				render: FormTextarea,
				schema: TextareaFieldSchema,
				metadata: {
					name: 'Textarea Field',
					description: 'Multi-line text input',
					category: 'input' as const,
				},
			};

			const builder = createReactFormComposer();
			builder.addElement(InputElementRegistration).addElement(textareaElement);

			const engine = builder.build();
			const elements = engine.getAllElements();

			expect(elements.map((element) => element.$type).sort()).toEqual(['input', 'textarea']);
		});

		test('should return undefined for non-existent element', () => {
			const builder = createReactFormComposer();
			const engine = builder.build();

			expect(engine.getElement('nonexistent')).toBeUndefined();
			expect(engine.hasElement('nonexistent')).toBe(false);
		});
	});

	describe('Type Safety', () => {
		test('should maintain type safety through builder', () => {
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
			const engine = createReactFormComposer().addElement(InputElementRegistration).build();

			expect(engine.hasElement('input')).toBe(true);
			expect(engine.getRecipeIds()).toEqual([]);

			const element = engine.getElement('input');
			expect(element?.$type).toBe('input');
			expect(element?.schema).toBe(InputFieldSchema);
			expect(element?.metadata.name).toBe('Text Input Field');
		});
	});
});

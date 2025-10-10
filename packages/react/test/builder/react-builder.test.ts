/**
 * Tests for React Form Engine Builder Pattern
 */

import { describe, test, expect } from 'bun:test';
import { 
	createReactFormEngine, 
	toElementRegistration, 
	toLayoutRegistration, 
	toStepperRegistration,
	type ReactElementRegistration 
} from '@/registries/builder-registry';
import { InputElement } from '@/components/form/fields/form-input';
import { FormTextarea } from '@/components/form/fields/form-textarea';
import { CardLayoutRegistration } from '@/components/layouts/card-layout';
import { DefaultStepperRegistration } from '@/components/steppers/default-stepper';
import { InputFieldSchema } from '@/components/form/fields/form-input.types';
import { TextareaFieldSchema } from '@/components/form/fields/form-textarea.types';

describe('React Form Engine Builder', () => {
	describe('Builder Creation', () => {
		test('should create a new builder instance', () => {
			const builder = createReactFormEngine();
			expect(builder).toBeDefined();
			expect(typeof builder.addElement).toBe('function');
			expect(typeof builder.addLayout).toBe('function');
			expect(typeof builder.addStepper).toBe('function');
			expect(typeof builder.build).toBe('function');
		});
	});

	describe('Element Registration', () => {
		test('should register input element', () => {
			const builder = createReactFormEngine();
			const elementReg = toElementRegistration(InputElement);
			
			builder.addElement(elementReg);
			const engine = builder.build();
			
			expect(engine.hasElement('input')).toBe(true);
			const element = engine.getElement('input');
			expect(element).toBeDefined();
			expect(element?.componentId).toBe('input');
		});

			test('should register multiple elements', () => {
			const textareaElement: ReactElementRegistration = {
				componentId: 'textarea',
				component: FormTextarea,
				schema: TextareaFieldSchema,
				metadata: {
					name: 'Textarea Field',
					description: 'Multi-line text input',
					category: 'input' as const,
				},
			};

			const builder = createReactFormEngine();
			builder
				.addElement(toElementRegistration(InputElement))
				.addElement(toElementRegistration(textareaElement));

			const engine = builder.build();
			
			expect(engine.hasElement('input')).toBe(true);
			expect(engine.hasElement('textarea')).toBe(true);
			
			const elementIds = engine.getElementIds();
			expect(elementIds).toContain('input');
			expect(elementIds).toContain('textarea');
		});

		test('should include element schema', () => {
			const builder = createReactFormEngine();
			builder.addElement(toElementRegistration(InputElement));
			
			const engine = builder.build();
			const element = engine.getElement('input');
			
			expect(element?.schema).toBeDefined();
			expect(element?.schema).toBe(InputFieldSchema);
		});

		test('should include element metadata', () => {
			const builder = createReactFormEngine();
			builder.addElement(toElementRegistration(InputElement));
			
			const engine = builder.build();
			const element = engine.getElement('input');
			
			expect(element?.metadata).toBeDefined();
			expect(element?.metadata.name).toBe('Text Input Field');
			expect(element?.metadata.category).toBe('input');
		});

		test('should throw error for duplicate element componentId', () => {
			const builder = createReactFormEngine();
			builder.addElement(toElementRegistration(InputElement));
			
			expect(() => {
				builder.addElement(toElementRegistration(InputElement));
			}).toThrow();
		});
	});

	describe('Layout Registration', () => {
		test('should register layout', () => {
			const builder = createReactFormEngine();
			builder.addLayout(toLayoutRegistration(CardLayoutRegistration));
			
			const engine = builder.build();
			
			expect(engine.hasLayout('card')).toBe(true);
			const layout = engine.getLayout('card');
			expect(layout).toBeDefined();
			expect(layout?.layoutId).toBe('card');
		});

		test('should include layout metadata', () => {
			const builder = createReactFormEngine();
			builder.addLayout(toLayoutRegistration(CardLayoutRegistration));
			
			const engine = builder.build();
			const layout = engine.getLayout('card');
			
			expect(layout?.metadata).toBeDefined();
			expect(layout?.metadata.name).toBeDefined();
		});
	});

	describe('Stepper Registration', () => {
		test('should register stepper', () => {
			const builder = createReactFormEngine();
			builder.addStepper(toStepperRegistration(DefaultStepperRegistration));
			
			const engine = builder.build();
			
			expect(engine.hasStepper('default')).toBe(true);
			const stepper = engine.getStepper('default');
			expect(stepper).toBeDefined();
			expect(stepper?.stepperId).toBe('default');
		});
	});

	describe('Method Chaining', () => {
		test('should support fluent API', () => {
			const builder = createReactFormEngine();
			
			const engine = builder
				.addElement(toElementRegistration(InputElement))
				.addLayout(toLayoutRegistration(CardLayoutRegistration))
				.addStepper(toStepperRegistration(DefaultStepperRegistration))
				.build();
			
			expect(engine.hasElement('input')).toBe(true);
			expect(engine.hasLayout('card')).toBe(true);
			expect(engine.hasStepper('default')).toBe(true);
		});
	});

	describe('Engine Build', () => {
		test('should build engine with registrations', () => {
			const builder = createReactFormEngine();
			builder.addElement(toElementRegistration(InputElement));
			
			const engine = builder.build();
			
			expect(engine).toBeDefined();
			expect(engine.hasElement('input')).toBe(true);
		});

		test('should build engine summary', () => {
			const builder = createReactFormEngine();
			builder
				.addElement(toElementRegistration(InputElement))
				.addLayout(toLayoutRegistration(CardLayoutRegistration))
				.addStepper(toStepperRegistration(DefaultStepperRegistration));
			
			const engine = builder.build();
			const summary = engine.getSummary();
			
			expect(summary.elements.count).toBe(1);
			expect(summary.layouts.count).toBe(1);
			expect(summary.steppers.count).toBe(1);
		});

		test('should allow building empty engine', () => {
			const builder = createReactFormEngine();
			const engine = builder.build();
			
			expect(engine.getElementIds()).toHaveLength(0);
			expect(engine.getLayoutIds()).toHaveLength(0);
		});
	});

	describe('Engine Retrieval', () => {
		test('should retrieve all elements', () => {
			const textareaElement: ReactElementRegistration = {
				componentId: 'textarea',
				component: FormTextarea,
				schema: TextareaFieldSchema,
				metadata: {
					name: 'Textarea Field',
					description: 'Multi-line text input',
					category: 'input' as const,
				},
			};

			const builder = createReactFormEngine();
			builder
				.addElement(toElementRegistration(InputElement))
				.addElement(toElementRegistration(textareaElement));
			
			const engine = builder.build();
			const elements = engine.getAllElements();
			
			expect(elements).toHaveLength(2);
			expect(engine.hasElement('input')).toBe(true);
			expect(engine.hasElement('textarea')).toBe(true);
		});

		test('should return undefined for non-existent element', () => {
			const builder = createReactFormEngine();
			const engine = builder.build();
			
			expect(engine.getElement('nonexistent')).toBeUndefined();
			expect(engine.hasElement('nonexistent')).toBe(false);
		});
	});

	describe('Type Safety', () => {
		test('should maintain type safety through builder', () => {
			const builder = createReactFormEngine();
			const elementReg = toElementRegistration(InputElement);
			
			expect(elementReg.componentId).toBe('input');
			expect(elementReg.render).toBeDefined();
			expect(typeof elementReg.render).toBe('function');
		});

		test('should convert React component to render function', () => {
			const elementReg = toElementRegistration(InputElement);
			
			expect(elementReg.render).toBeDefined();
			expect(typeof elementReg.render).toBe('function');
		});
	});

	describe('Integration', () => {
		test('should create a fully configured form engine', () => {
			const builder = createReactFormEngine();
			
			const engine = builder
				.addElement(toElementRegistration(InputElement))
				.addLayout(toLayoutRegistration(CardLayoutRegistration))
				.addStepper(toStepperRegistration(DefaultStepperRegistration))
				.build();
			
			expect(engine.hasElement('input')).toBe(true);
			expect(engine.hasLayout('card')).toBe(true);
			expect(engine.hasStepper('default')).toBe(true);
			
			const element = engine.getElement('input');
			expect(element?.componentId).toBe('input');
			expect(element?.schema).toBe(InputFieldSchema);
			expect(element?.metadata.name).toBe('Text Input Field');
		});
	});
});

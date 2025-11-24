/**
 * Tests for React Form Engine Builder Pattern
 */

import { describe, test, expect } from 'bun:test';
import { createReactFormEngine } from '@/registries/builder-registry';
import { InputElementRegistration } from '@/components/elements/shadcn/inputs/form-input.registration';
import { FormTextarea } from '@/components/elements/shadcn/inputs/form-textarea';
import { CardLayoutRegistration } from '@/components/layouts/card-layout.registration';
import { DefaultStepperRegistration } from '@/components/steppers/default-stepper.registration';
import { InputFieldSchema } from '@/components/elements/shadcn/inputs/form-input.types';
import { TextareaFieldSchema } from '@/components/elements/shadcn/inputs/form-textarea.types';

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
			const elementReg = InputElementRegistration;

			builder.addElement(elementReg);
			const engine = builder.build();

			expect(engine.hasElement('input')).toBe(true);
			const element = engine.getElement('input');
			expect(element).toBeDefined();
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

			const builder = createReactFormEngine();
			builder.addElement(InputElementRegistration).addElement(textareaElement);

			const engine = builder.build();

			expect(engine.hasElement('input')).toBe(true);
			expect(engine.hasElement('textarea')).toBe(true);

			const elementIds = engine.getElementIds();
			expect(elementIds).toContain('input');
			expect(elementIds).toContain('textarea');
		});

		test('should include element schema', () => {
			const builder = createReactFormEngine();
			builder.addElement(InputElementRegistration);

			const engine = builder.build();
			const element = engine.getElement('input');

			expect(element?.schema).toBeDefined();
			expect(element?.schema).toBe(InputFieldSchema);
		});

		test('should include element metadata', () => {
			const builder = createReactFormEngine();
			builder.addElement(InputElementRegistration);

			const engine = builder.build();
			const element = engine.getElement('input');

			expect(element?.metadata).toBeDefined();
			expect(element?.metadata.name).toBe('Text Input Field');
			expect(element?.metadata.category).toBe('input');
		});
	});

	describe('Layout Registration', () => {
		test('should register layout', () => {
			const builder = createReactFormEngine();
			builder.addLayout(CardLayoutRegistration);

			const engine = builder.build();

			expect(engine.hasLayout('card')).toBe(true);
			const layout = engine.getLayout('card');
			expect(layout).toBeDefined();
			expect(layout?.$type).toBe('card');
		});

		test('should include layout metadata', () => {
			const builder = createReactFormEngine();
			builder.addLayout(CardLayoutRegistration);

			const engine = builder.build();
			const layout = engine.getLayout('card');

			expect(layout?.metadata).toBeDefined();
			expect(layout?.metadata.name).toBeDefined();
		});
	});

	describe('Stepper Registration', () => {
		test('should register stepper', () => {
			const builder = createReactFormEngine();
			builder.addStepper(DefaultStepperRegistration);

			const engine = builder.build();

			expect(engine.hasStepper('default')).toBe(true);
			const stepper = engine.getStepper('default');
			expect(stepper).toBeDefined();
			expect(stepper?.$type).toBe('default');
		});
	});

	describe('Method Chaining', () => {
		test('should support fluent API', () => {
			const builder = createReactFormEngine();

			const engine = builder
				.addElement(InputElementRegistration)
				.addLayout(CardLayoutRegistration)
				.addStepper(DefaultStepperRegistration)
				.build();

			expect(engine.hasElement('input')).toBe(true);
			expect(engine.hasLayout('card')).toBe(true);
			expect(engine.hasStepper('default')).toBe(true);
		});
	});

	describe('Engine Build', () => {
		test('should build engine with registrations', () => {
			const builder = createReactFormEngine();
			builder.addElement(InputElementRegistration);

			const engine = builder.build();

			expect(engine).toBeDefined();
			expect(engine.hasElement('input')).toBe(true);
		});

		test('should build engine summary', () => {
			const builder = createReactFormEngine();
			builder
				.addElement(InputElementRegistration)
				.addLayout(CardLayoutRegistration)
				.addStepper(DefaultStepperRegistration);

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
			expect(engine.getStepperIds()).toHaveLength(0);
			expect(engine.getLayoutIds()).toHaveLength(0);
			expect(engine.getActionTypes()).toHaveLength(0);
			const summary = engine.getSummary();
			expect(summary.elements.count).toBe(0);
			expect(summary.layouts.count).toBe(0);
			expect(summary.steppers.count).toBe(0);
			expect(summary.actions.count).toBe(0);
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

			const builder = createReactFormEngine();
			builder.addElement(InputElementRegistration).addElement(textareaElement);

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
			const elementReg = InputElementRegistration;

			expect(elementReg.$type).toBe('input');
			expect(elementReg.render).toBeDefined();
			expect(typeof elementReg.render).toBe('function');
		});

		test('should convert React component to render function', () => {
			const elementReg = InputElementRegistration;

			expect(elementReg.render).toBeDefined();
			expect(typeof elementReg.render).toBe('function');
		});
	});

	describe('Integration', () => {
		test('should create a fully configured form engine', () => {
			const builder = createReactFormEngine();

			const engine = builder
				.addElement(InputElementRegistration)
				.addLayout(CardLayoutRegistration)
				.addStepper(DefaultStepperRegistration)
				.build();

			expect(engine.hasElement('input')).toBe(true);
			expect(engine.hasLayout('card')).toBe(true);
			expect(engine.hasStepper('default')).toBe(true);

			const element = engine.getElement('input');
			expect(element?.$type).toBe('input');
			expect(element?.schema).toBe(InputFieldSchema);
			expect(element?.metadata.name).toBe('Text Input Field');
		});
	});
});

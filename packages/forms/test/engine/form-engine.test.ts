import { test, expect, describe } from 'bun:test';
import { z } from 'zod';
import { FormEngineBuilder } from '@/builder';
import type { ElementRegistration, LayoutRegistration } from '@/types';

describe('FormEngine', () => {
	describe('Element Retrieval', () => {
		test('should get element by id', () => {
			const textInput: ElementRegistration = {
				$type: 'text',
				schema: z.object({ name: z.string() }),
				metadata: { name: 'Text Input', category: 'input' },
				render: (props) => props,
			};

			const engine = new FormEngineBuilder().addElement(textInput).build();

			const element = engine.getElement('text');
			expect(element).toBeDefined();
			expect(element?.$type).toBe('text');
			expect(element?.metadata.name).toBe('Text Input');
		});

		test('should return undefined for non-existent element', () => {
			const engine = new FormEngineBuilder().build();
			const element = engine.getElement('nonexistent');
			expect(element).toBeUndefined();
		});

		test('should get all elements', () => {
			const textInput: ElementRegistration = {
				$type: 'text',
				schema: z.object({}),
				metadata: { name: 'Text', category: 'input' },
				render: (props) => props,
			};

			const emailInput: ElementRegistration = {
				$type: 'email',
				schema: z.object({}),
				metadata: { name: 'Email', category: 'input' },
				render: (props) => props,
			};

			const engine = new FormEngineBuilder().addElements([textInput, emailInput]).build();

			const elements = engine.getAllElements();
			expect(elements).toHaveLength(2);
			expect(elements[0].$type).toBe('text');
			expect(elements[1].$type).toBe('email');
		});

		test('should get all element IDs', () => {
			const textInput: ElementRegistration = {
				$type: 'text',
				schema: z.object({}),
				metadata: { name: 'Text', category: 'input' },
				render: (props) => props,
			};

			const emailInput: ElementRegistration = {
				$type: 'email',
				schema: z.object({}),
				metadata: { name: 'Email', category: 'input' },
				render: (props) => props,
			};

			const engine = new FormEngineBuilder().addElements([textInput, emailInput]).build();

			const ids = engine.getElementIds();
			expect(ids).toHaveLength(2);
			expect(ids).toContain('text');
			expect(ids).toContain('email');
		});

		test('should check if element exists', () => {
			const textInput: ElementRegistration = {
				$type: 'text',
				schema: z.object({}),
				metadata: { name: 'Text', category: 'input' },
				render: (props) => props,
			};

			const engine = new FormEngineBuilder().addElement(textInput).build();

			expect(engine.hasElement('text')).toBe(true);
			expect(engine.hasElement('nonexistent')).toBe(false);
		});
	});

	describe('Layout Retrieval', () => {
		test('should get layout by id', () => {
			const cardLayout: LayoutRegistration = {
				$type: 'card',
				schema: z.object({}),
				metadata: { name: 'Card Layout' },
				render: (props) => props,
			};

			const engine = new FormEngineBuilder().addLayout(cardLayout).build();

			const layout = engine.getLayout('card');
			expect(layout).toBeDefined();
			expect(layout?.$type).toBe('card');
			expect(layout?.metadata.name).toBe('Card Layout');
		});

		test('should return undefined for non-existent layout', () => {
			const engine = new FormEngineBuilder().build();
			const layout = engine.getLayout('nonexistent');
			expect(layout).toBeUndefined();
		});

		test('should get all layouts', () => {
			const cardLayout: LayoutRegistration = {
				$type: 'card',
				schema: z.object({}),
				metadata: { name: 'Card' },
				render: (props) => props,
			};

			const gridLayout: LayoutRegistration = {
				$type: 'grid',
				schema: z.object({}),
				metadata: { name: 'Grid' },
				render: (props) => props,
			};

			const engine = new FormEngineBuilder().addLayouts([cardLayout, gridLayout]).build();

			const layouts = engine.getAllLayouts();
			expect(layouts).toHaveLength(2);
		});

		test('should get all layout IDs', () => {
			const cardLayout: LayoutRegistration = {
				$type: 'card',
				schema: z.object({}),
				metadata: { name: 'Card' },
				render: (props) => props,
			};

			const engine = new FormEngineBuilder().addLayout(cardLayout).build();

			const ids = engine.getLayoutIds();
			expect(ids).toHaveLength(1);
			expect(ids).toContain('card');
		});

		test('should check if layout exists', () => {
			const cardLayout: LayoutRegistration = {
				$type: 'card',
				schema: z.object({}),
				metadata: { name: 'Card' },
				render: (props) => props,
			};

			const engine = new FormEngineBuilder().addLayout(cardLayout).build();

			expect(engine.hasLayout('card')).toBe(true);
			expect(engine.hasLayout('nonexistent')).toBe(false);
		});
	});

	describe('Stepper Retrieval', () => {
		test('should get stepper by id', () => {
			const wizardStepper = {
				$type: 'wizard',
				schema: z.object({}),
				metadata: { name: 'Wizard Stepper' },
				render: (props: any) => props,
			};

			const engine = new FormEngineBuilder().addStepper(wizardStepper).build();

			const stepper = engine.getStepper('wizard');
			expect(stepper).toBeDefined();
			expect(stepper?.$type).toBe('wizard');
		});

		test('should check if stepper exists', () => {
			const wizardStepper = {
				$type: 'wizard',
				schema: z.object({}),
				metadata: { name: 'Wizard' },
				render: (props: any) => props,
			};

			const engine = new FormEngineBuilder().addStepper(wizardStepper).build();

			expect(engine.hasStepper('wizard')).toBe(true);
			expect(engine.hasStepper('nonexistent')).toBe(false);
		});
	});

	describe('Action Retrieval', () => {
		test('should get action by id', () => {
			const submitAction = {
				$type: 'submit',
				schema: z.object({}),
				metadata: { name: 'Submit' },
				execute: async () => ({ success: true }),
			};

			const engine = new FormEngineBuilder().addAction(submitAction).build();

			const action = engine.getAction('submit');
			expect(action).toBeDefined();
			expect(action?.$type).toBe('submit');
		});

		test('should check if action exists', () => {
			const submitAction = {
				$type: 'submit',
				schema: z.object({}),
				metadata: { name: 'Submit' },
				execute: async () => ({ success: true }),
			};

			const engine = new FormEngineBuilder().addAction(submitAction).build();

			expect(engine.hasAction('submit')).toBe(true);
			expect(engine.hasAction('nonexistent')).toBe(false);
		});

		test('should get all action types', () => {
			const submitAction = {
				$type: 'submit',
				schema: z.object({}),
				metadata: { name: 'Submit' },
				execute: async () => ({ success: true }),
			};

			const resetAction = {
				$type: 'reset',
				schema: z.object({}),
				metadata: { name: 'Reset' },
				execute: async () => ({ success: true }),
			};

			const engine = new FormEngineBuilder().addActions([submitAction, resetAction]).build();

			const types = engine.getActionTypes();
			expect(types).toHaveLength(2);
			expect(types).toContain('submit');
			expect(types).toContain('reset');
		});
	});

	describe('Summary', () => {
		test('should provide complete summary', () => {
			const textInput: ElementRegistration = {
				$type: 'text',
				schema: z.object({}),
				metadata: { name: 'Text', category: 'input' },
				render: (props) => props,
			};

			const cardLayout: LayoutRegistration = {
				$type: 'card',
				schema: z.object({}),
				metadata: { name: 'Card' },
				render: (props) => props,
			};

			const wizardStepper = {
				$type: 'wizard',
				schema: z.object({}),
				metadata: { name: 'Wizard' },
				render: (props: any) => props,
			};

			const submitAction = {
				$type: 'submit',
				schema: z.object({}),
				metadata: { name: 'Submit' },
				execute: async () => ({ success: true }),
			};

			const engine = new FormEngineBuilder()
				.addElement(textInput)
				.addLayout(cardLayout)
				.addStepper(wizardStepper)
				.addAction(submitAction)
				.build();

			const summary = engine.getSummary();

			expect(summary.elements.count).toBe(1);
			expect(summary.elements.ids).toContain('text');

			expect(summary.layouts.count).toBe(1);
			expect(summary.layouts.ids).toContain('card');

			expect(summary.steppers.count).toBe(1);
			expect(summary.steppers.ids).toContain('wizard');

			expect(summary.actions.count).toBe(1);
			expect(summary.actions.types).toContain('submit');
		});

		test('should show empty summary for empty engine', () => {
			const engine = new FormEngineBuilder().build();
			const summary = engine.getSummary();

			expect(summary.elements.count).toBe(0);
			expect(summary.layouts.count).toBe(0);
			expect(summary.steppers.count).toBe(0);
			expect(summary.actions.count).toBe(0);
		});
	});

	describe('Immutability', () => {
		test('should not allow modifications after build', () => {
			const textInput: ElementRegistration = {
				$type: 'text',
				schema: z.object({}),
				metadata: { name: 'Text', category: 'input' },
				render: (props) => props,
			};

			const builder = new FormEngineBuilder().addElement(textInput);
			const engine = builder.build();

			// Verify engine has the element
			expect(engine.hasElement('text')).toBe(true);

			// Attempting to add more to builder shouldn't affect built engine
			const emailInput: ElementRegistration = {
				$type: 'email',
				schema: z.object({}),
				metadata: { name: 'Email', category: 'input' },
				render: (props) => props,
			};

			builder.addElement(emailInput);

			// Original engine should not have the new element
			expect(engine.hasElement('email')).toBe(false);
			expect(engine.getAllElements()).toHaveLength(1);
		});
	});

	describe('Integration', () => {
		test('should work with real-world component configuration', () => {
			const textInputSchema = z.object({
				name: z.string(),
				label: z.string(),
				placeholder: z.string().optional(),
				required: z.boolean().optional(),
				validation: z
					.array(
						z.object({
							type: z.string(),
							message: z.string(),
						}),
					)
					.optional(),
			});

			const textInput: ElementRegistration<z.infer<typeof textInputSchema>> = {
				$type: 'text',
				schema: textInputSchema,
				metadata: {
					name: 'Text Input',
					description: 'Single-line text input with validation',
					category: 'input',
					icon: 'text',
					tags: ['input', 'text', 'basic'],
					version: '1.0.0',
				},
				render: (props) => {
					// Mock render function
					return { type: 'input', props };
				},
			};

			const engine = new FormEngineBuilder().addElement(textInput).build();

			const retrieved = engine.getElement('text');
			expect(retrieved).toBeDefined();
			expect(retrieved?.metadata.version).toBe('1.0.0');
			expect(retrieved?.metadata.tags).toContain('input');

			// Test schema validation
			const validConfig = {
				name: 'username',
				label: 'Username',
				required: true,
			};

			const result = retrieved?.schema.safeParse(validConfig);
			expect(result?.success).toBe(true);
		});
	});
});

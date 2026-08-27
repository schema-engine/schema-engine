import { test, expect, describe } from 'vitest';
import { z } from 'zod';
import { FormComposer } from '@/builder';
import type { InputRegistration, LayoutRegistration, StepperRegistration, BuilderActionRegistration } from '@/types';

function createActionSchema<TType extends string>(type: TType, shape: z.ZodRawShape = {}) {
	return z.object({
		id: z.string(),
		$type: z.literal(type),
		...shape,
	});
}

describe('FormComposer', () => {
	describe('Element Registration', () => {
		test('should register a single element', () => {
			const textInputSchema = z.object({
				name: z.string(),
				label: z.string(),
			});

			const textInputRegistration: InputRegistration<'text', z.infer<typeof textInputSchema>> = {
				$type: 'text',
				schema: textInputSchema,
				metadata: {
					name: 'Text Input',
					description: 'Single-line text input',
					category: 'input',
					icon: 'text',
				},
				render: () => {},
			};

			const builder = new FormComposer();
			const result = builder.addElement(textInputRegistration);

			expect(result).toBeInstanceOf(FormComposer);
		});

		test('should register multiple elements', () => {
			const textInputRegistration: InputRegistration = {
				$type: 'text',
				schema: z.object({ name: z.string() }),
				metadata: {
					name: 'Text Input',
					category: 'input',
				},
				render: () => {},
			};

			const emailInputRegistration: InputRegistration = {
				$type: 'email',
				schema: z.object({ name: z.string() }),
				metadata: {
					name: 'Email Input',
					category: 'input',
				},
				render: () => {},
			};

			const builder = new FormComposer();
			builder.addElements([textInputRegistration, emailInputRegistration]);

			const engine = builder.build();
			expect(engine.hasElement('text')).toBe(true);
			expect(engine.hasElement('email')).toBe(true);
		});

		test('should override duplicate element id with warning', () => {
			const registration1: InputRegistration = {
				$type: 'text',
				schema: z.object({}),
				metadata: {
					name: 'Text Input',
					category: 'input',
				},
				render: () => {},
			};

			const registration2: InputRegistration = {
				$type: 'text',
				schema: z.object({}),
				metadata: {
					name: 'Custom Text Input',
					category: 'input',
				},
				render: () => {},
			};

			const builder = new FormComposer();
			builder.addElement(registration1);
			builder.addElement(registration2);

			const engine = builder.build();
			const element = engine.getElement('text');
			expect(element?.metadata.name).toBe('Custom Text Input');
		});

		test('should support all element categories', () => {
			const inputElement: InputRegistration = {
				$type: 'text',
				schema: z.object({ name: z.string() }),
				metadata: { name: 'Text', category: 'input' },
				render: () => {},
			};

			const contentElement: InputRegistration = {
				$type: 'heading',
				schema: z.object({ text: z.string() }),
				metadata: { name: 'Heading', category: 'content' },
				render: () => {},
			};

			const decorationElement: InputRegistration = {
				$type: 'divider',
				schema: z.object({}),
				metadata: { name: 'Divider', category: 'decoration' },
				render: () => {},
			};

			const interactiveElement: InputRegistration = {
				$type: 'button',
				schema: z.object({ label: z.string() }),
				metadata: { name: 'Button', category: 'interactive' },
				render: () => {},
			};

			const builder = new FormComposer()
				.addElement(inputElement)
				.addElement(contentElement)
				.addElement(decorationElement)
				.addElement(interactiveElement);

			const engine = builder.build();

			expect(engine.hasElement('text')).toBe(true);
			expect(engine.hasElement('heading')).toBe(true);
			expect(engine.hasElement('divider')).toBe(true);
			expect(engine.hasElement('button')).toBe(true);
		});
	});

	describe('Layout Registration', () => {
		test('should register a single layout', () => {
			const cardLayoutRegistration: LayoutRegistration = {
				$type: 'card',
				schema: z.object({ maxWidth: z.string().optional() }),
				metadata: {
					name: 'Card Layout',
					description: 'Display form in a card',
				},
				render: () => {},
			};

			const builder = new FormComposer();
			const result = builder.addLayout(cardLayoutRegistration);

			expect(result).toBeInstanceOf(FormComposer);
		});

		test('should register multiple layouts', () => {
			const cardLayout: LayoutRegistration = {
				$type: 'card',
				schema: z.object({}),
				metadata: { name: 'Card Layout' },
				render: () => {},
			};

			const gridLayout: LayoutRegistration = {
				$type: 'grid',
				schema: z.object({}),
				metadata: { name: 'Grid Layout' },
				render: () => {},
			};

			const builder = new FormComposer();
			builder.addLayouts([cardLayout, gridLayout]);

			const engine = builder.build();
			expect(engine.hasLayout('card')).toBe(true);
			expect(engine.hasLayout('grid')).toBe(true);
		});

		test('should override duplicate layout id with warning', () => {
			const registration1: LayoutRegistration = {
				$type: 'card',
				schema: z.object({}),
				metadata: { name: 'Card Layout' },
				render: () => {},
			};

			const registration2: LayoutRegistration = {
				$type: 'card',
				schema: z.object({}),
				metadata: { name: 'Custom Card Layout' },
				render: () => {},
			};

			const builder = new FormComposer();
			builder.addLayout(registration1);
			builder.addLayout(registration2);

			const engine = builder.build();
			const layout = engine.getLayout('card');
			expect(layout?.metadata.name).toBe('Custom Card Layout');
		});
	});

	describe('Stepper Registration', () => {
		test('should register a single stepper', () => {
			const wizardStepperRegistration: StepperRegistration = {
				$type: 'wizard',
				schema: z.object({}),
				metadata: {
					name: 'Wizard Stepper',
					description: 'Step-by-step wizard',
				},
				render: () => {},
			};

			const builder = new FormComposer();
			const result = builder.addStepper(wizardStepperRegistration);

			expect(result).toBeInstanceOf(FormComposer);
		});

		test('should register multiple steppers', () => {
			const wizardStepper: StepperRegistration = {
				$type: 'wizard',
				schema: z.object({}),
				metadata: { name: 'Wizard' },
				render: () => {},
			};

			const tabsStepper: StepperRegistration = {
				$type: 'tabs',
				schema: z.object({}),
				metadata: { name: 'Tabs' },
				render: () => {},
			};

			const builder = new FormComposer();
			builder.addSteppers([wizardStepper, tabsStepper]);

			const engine = builder.build();
			expect(engine.hasStepper('wizard')).toBe(true);
			expect(engine.hasStepper('tabs')).toBe(true);
		});

		test('should override duplicate stepper id with warning', () => {
			const registration1: StepperRegistration = {
				$type: 'wizard',
				schema: z.object({}),
				metadata: { name: 'Wizard' },
				render: () => {},
			};

			const registration2: StepperRegistration = {
				$type: 'wizard',
				schema: z.object({}),
				metadata: { name: 'Custom Wizard' },
				render: () => {},
			};

			const builder = new FormComposer();
			builder.addStepper(registration1);
			builder.addStepper(registration2);

			const engine = builder.build();
			const stepper = engine.getStepper('wizard');
			expect(stepper?.metadata.name).toBe('Custom Wizard');
		});
	});

	describe('Action Registration', () => {
		test('should register a single action', () => {
			const submitActionRegistration: BuilderActionRegistration = {
				$type: 'submit',
				schema: createActionSchema('submit', { endpoint: z.string() }),
				metadata: {
					name: 'Submit Form',
					description: 'Submit form data',
				},
				execute: async () => ({ success: true }),
			};

			const builder = new FormComposer();
			const result = builder.addAction(submitActionRegistration);

			expect(result).toBeInstanceOf(FormComposer);
		});

		test('should register multiple actions', () => {
			const submitAction: BuilderActionRegistration = {
				$type: 'submit',
				schema: createActionSchema('submit'),
				metadata: { name: 'Submit' },
				execute: async () => ({ success: true }),
			};

			const resetAction: BuilderActionRegistration = {
				$type: 'reset',
				schema: createActionSchema('reset'),
				metadata: { name: 'Reset' },
				execute: async () => ({ success: true }),
			};

			const builder = new FormComposer();
			builder.addActions([submitAction, resetAction]);

			const engine = builder.build();
			expect(engine.hasAction('submit')).toBe(true);
			expect(engine.hasAction('reset')).toBe(true);
		});

		test('should override duplicate action id with warning', () => {
			const registration1: BuilderActionRegistration = {
				$type: 'submit',
				schema: createActionSchema('submit'),
				metadata: { name: 'Submit' },
				execute: async () => ({ success: true }),
			};

			const registration2: BuilderActionRegistration = {
				$type: 'submit',
				schema: createActionSchema('submit'),
				metadata: { name: 'Custom Submit' },
				execute: async () => ({ success: true, custom: true }),
			};

			const builder = new FormComposer();
			builder.addAction(registration1);
			builder.addAction(registration2);

			const engine = builder.build();
			const action = engine.getAction('submit');
			expect(action?.metadata.name).toBe('Custom Submit');
		});
	});

	describe('Fluent API / Method Chaining', () => {
		test('should support method chaining', () => {
			const element: InputRegistration = {
				$type: 'text',
				schema: z.object({}),
				metadata: { name: 'Text', category: 'input' },
				render: () => {},
			};

			const layout: LayoutRegistration = {
				$type: 'card',
				schema: z.object({}),
				metadata: { name: 'Card' },
				render: () => {},
			};

			const stepper: StepperRegistration = {
				$type: 'wizard',
				schema: z.object({}),
				metadata: { name: 'Wizard' },
				render: () => {},
			};

			const action: BuilderActionRegistration = {
				$type: 'submit',
				schema: createActionSchema('submit'),
				metadata: { name: 'Submit' },
				execute: async () => ({ success: true }),
			};

			const builder = new FormComposer()
				.addElement(element)
				.addLayout(layout)
				.addStepper(stepper)
				.addAction(action);

			const engine = builder.build();

			expect(engine.hasElement('text')).toBe(true);
			expect(engine.hasLayout('card')).toBe(true);
			expect(engine.hasStepper('wizard')).toBe(true);
			expect(engine.hasAction('submit')).toBe(true);
		});
	});

	describe('Build Method', () => {
		test('should create immutable FormEngine instance', () => {
			const builder = new FormComposer();
			const engine = builder.build();

			expect(typeof engine.getElement).toBe('function');
			expect(typeof engine.getAllElements).toBe('function');
		});

		test('should build empty engine', () => {
			const builder = new FormComposer();
			const engine = builder.build();

			expect(engine.getAllElements()).toEqual([]);
			expect(engine.getAllLayouts()).toEqual([]);
			expect(engine.getAllSteppers()).toEqual([]);
			expect(engine.getAllActions()).toEqual([]);
		});

		test('should preserve all registrations after build', () => {
			const element: InputRegistration = {
				$type: 'text',
				schema: z.object({}),
				metadata: { name: 'Text', category: 'input' },
				render: () => {},
			};

			const builder = new FormComposer().addElement(element);
			const engine = builder.build();

			const retrieved = engine.getElement('text');
			expect(retrieved?.$type).toBe('text');
			expect(retrieved?.metadata.name).toBe('Text');
		});
	});

	describe('Complete Integration', () => {
		test('should create fully configured form engine', () => {
			const textInput: InputRegistration = {
				$type: 'text',
				schema: z.object({ name: z.string(), label: z.string() }),
				metadata: {
					name: 'Text Input',
					description: 'Single-line text input',
					category: 'input',
					icon: 'text',
				},
				render: () => {},
			};

			const emailInput: InputRegistration = {
				$type: 'email',
				schema: z.object({ name: z.string(), label: z.string() }),
				metadata: {
					name: 'Email Input',
					description: 'Email input field',
					category: 'input',
					icon: 'email',
				},
				render: () => {},
			};

			const heading: InputRegistration = {
				$type: 'heading',
				schema: z.object({ text: z.string(), level: z.number() }),
				metadata: {
					name: 'Heading',
					description: 'Heading element',
					category: 'content',
					icon: 'heading',
				},
				render: () => {},
			};

			const cardLayout: LayoutRegistration = {
				$type: 'card',
				schema: z.object({ maxWidth: z.string().optional() }),
				metadata: {
					name: 'Card Layout',
					description: 'Card-based layout',
					icon: 'card',
				},
				render: () => {},
			};

			const wizardStepper: StepperRegistration = {
				$type: 'wizard',
				schema: z.object({ showProgress: z.boolean().optional() }),
				metadata: {
					name: 'Wizard Stepper',
					description: 'Step-by-step wizard',
					icon: 'wizard',
				},
				render: () => {},
			};

			const submitAction: BuilderActionRegistration = {
				$type: 'submit',
				schema: createActionSchema('submit', { endpoint: z.string(), method: z.string() }),
				metadata: {
					name: 'Submit Form',
					description: 'Submit form to endpoint',
					icon: 'send',
				},
				execute: async () => {
					return { success: true, message: 'Form submitted' };
				},
			};

			const engine = new FormComposer()
				.addElements([textInput, emailInput, heading])
				.addLayout(cardLayout)
				.addStepper(wizardStepper)
				.addAction(submitAction)
				.build();

			// Verify
			const summary = engine.getSummary();
			expect(summary.elements.count).toBe(3);
			expect(summary.layouts.count).toBe(1);
			expect(summary.steppers.count).toBe(1);
			expect(summary.actions.count).toBe(1);

			expect(summary.elements.ids).toContain('text');
			expect(summary.elements.ids).toContain('email');
			expect(summary.elements.ids).toContain('heading');
			expect(summary.layouts.ids).toContain('card');
			expect(summary.steppers.ids).toContain('wizard');
			expect(summary.actions.types).toContain('submit');
		});
	});

	describe('clone()', () => {
		test('should create independent copy of builder with all registrations', () => {
			const textInput: InputRegistration = {
				$type: 'text',
				schema: z.object({ name: z.string() }),
				metadata: { name: 'Text Input', category: 'input' },
				render: () => {},
			};

			const cardLayout: LayoutRegistration = {
				$type: 'card',
				schema: z.object({ padding: z.number() }),
				metadata: { name: 'Card Layout' },
				render: () => {},
			};

			const wizardStepper: StepperRegistration = {
				$type: 'wizard',
				schema: z.object({ showProgress: z.boolean() }),
				metadata: { name: 'Wizard' },
				render: () => {},
			};

			const submitAction: BuilderActionRegistration = {
				$type: 'submit',
				schema: createActionSchema('submit', { url: z.string() }),
				metadata: { name: 'Submit' },
				execute: async () => ({ success: true }),
			};

			const originalBuilder = new FormComposer()
				.addElement(textInput)
				.addLayout(cardLayout)
				.addStepper(wizardStepper)
				.addAction(submitAction);

			const clonedBuilder = originalBuilder.clone();

			const originalEngine = originalBuilder.build();
			const clonedEngine = clonedBuilder.build();

			expect(originalEngine.getElementIds()).toEqual(['text']);
			expect(clonedEngine.getElementIds()).toEqual(['text']);
			expect(originalEngine.getLayoutIds()).toEqual(['card']);
			expect(clonedEngine.getLayoutIds()).toEqual(['card']);
			expect(originalEngine.getStepperIds()).toEqual(['wizard']);
			expect(clonedEngine.getStepperIds()).toEqual(['wizard']);
			expect(originalEngine.getActionTypes()).toEqual(['submit']);
			expect(clonedEngine.getActionTypes()).toEqual(['submit']);
		});

		test('should create independent registries that do not affect original', () => {
			const textInput: InputRegistration = {
				$type: 'text',
				schema: z.object({ name: z.string() }),
				metadata: { name: 'Text Input', category: 'input' },
				render: () => {},
			};

			const emailInput: InputRegistration = {
				$type: 'email',
				schema: z.object({ name: z.string() }),
				metadata: { name: 'Email Input', category: 'input' },
				render: () => {},
			};

			const originalBuilder = new FormComposer().addElement(textInput);

			const clonedBuilder = originalBuilder.clone().addElement(emailInput);

			const originalEngine = originalBuilder.build();
			const clonedEngine = clonedBuilder.build();

			expect(originalEngine.getElementIds()).toEqual(['text']);
			expect(originalEngine.getElement('email')).toBeUndefined();

			expect(clonedEngine.getElementIds().sort()).toEqual(['email', 'text']);
			expect(clonedEngine.getElement('text')?.$type).toBe('text');
			expect(clonedEngine.getElement('email')?.$type).toBe('email');
		});

		test('should allow composition pattern with clone', () => {
			const textInput: InputRegistration = {
				$type: 'text',
				schema: z.object({ name: z.string() }),
				metadata: { name: 'Text Input', category: 'input' },
				render: () => {},
			};

			const numberInput: InputRegistration = {
				$type: 'number',
				schema: z.object({ name: z.string() }),
				metadata: { name: 'Number Input', category: 'input' },
				render: () => {},
			};

			const submitAction: BuilderActionRegistration = {
				$type: 'submit',
				schema: createActionSchema('submit', { url: z.string() }),
				metadata: { name: 'Submit' },
				execute: async () => ({ success: true }),
			};

			const logAction: BuilderActionRegistration = {
				$type: 'log',
				schema: createActionSchema('log', { message: z.string() }),
				metadata: { name: 'Log' },
				execute: async () => ({ success: true }),
			};

			const baseBuilder = new FormComposer().addElement(textInput).addElement(numberInput);

			const formBuilderWithSubmit = baseBuilder.clone().addAction(submitAction);

			const formBuilderWithLog = baseBuilder.clone().addAction(logAction);

			const engineWithSubmit = formBuilderWithSubmit.build();
			const engineWithLog = formBuilderWithLog.build();

			expect(engineWithSubmit.getElementIds().sort()).toEqual(['number', 'text']);
			expect(engineWithSubmit.getActionTypes()).toEqual(['submit']);
			expect(engineWithSubmit.getAction('log')).toBeUndefined();

			expect(engineWithLog.getElementIds().sort()).toEqual(['number', 'text']);
			expect(engineWithLog.getActionTypes()).toEqual(['log']);
			expect(engineWithLog.getAction('submit')).toBeUndefined();
		});

		test('should clone empty builder correctly', () => {
			const originalBuilder = new FormComposer();
			const clonedBuilder = originalBuilder.clone();

			const originalEngine = originalBuilder.build();
			const clonedEngine = clonedBuilder.build();

			expect(originalEngine.getAllElements()).toEqual([]);
			expect(clonedEngine.getAllElements()).toEqual([]);
			expect(originalEngine.getAllLayouts()).toEqual([]);
			expect(clonedEngine.getAllLayouts()).toEqual([]);
			expect(originalEngine.getAllSteppers()).toEqual([]);
			expect(clonedEngine.getAllSteppers()).toEqual([]);
			expect(originalEngine.getAllActions()).toEqual([]);
			expect(clonedEngine.getAllActions()).toEqual([]);
		});
	});
});

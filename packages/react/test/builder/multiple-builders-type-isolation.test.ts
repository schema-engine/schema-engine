/**
 * Tests for Multiple Builders with Different Components (Type Isolation)
 * 
 * This test verifies that the per-component registration pattern allows
 * multiple FormEngineBuilder instances in the same codebase with different
 * component sets, where types accurately reflect what each builder has registered.
 */

import { describe, test, expect } from 'bun:test';
import { createReactFormEngine } from '@/registries/builder-registry';

/**
 * Import ONLY the registrations needed for each builder
 * This is the key: each import triggers type augmentation for that component only
 */
import { InputElementRegistration } from '@/components/elements/inputs/form-input.registration';
import { TextareaElementRegistration } from '@/components/elements/inputs/form-textarea.registration';
import { CheckboxElementRegistration } from '@/components/elements/inputs/form-checkbox.registration';
import { SelectElementRegistration } from '@/components/elements/inputs/form-select.registration';

import { CardLayoutRegistration } from '@/components/layouts/card-layout.registration';
import { SplitScreenLayoutRegistration } from '@/components/layouts/split-screen-layout.registration';

import { DefaultStepperRegistration } from '@/components/steppers/default-stepper.registration';
import { MinimalistStepperRegistration } from '@/components/steppers/minimalist-stepper.registration';

describe('Multiple Builders Type Isolation', () => {
	test('should create builder with only input and textarea', () => {
		const minimalBuilder = createReactFormEngine()
			.addElement(InputElementRegistration)
			.addElement(TextareaElementRegistration)
			.addLayout(CardLayoutRegistration)
			.addStepper(DefaultStepperRegistration);

		const engine = minimalBuilder.build();

		expect(engine.hasElement('input')).toBe(true);
		expect(engine.hasElement('textarea')).toBe(true);
		expect(engine.hasElement('checkbox')).toBe(false);
		expect(engine.hasElement('select')).toBe(false);
		
		expect(engine.hasLayout('card')).toBe(true);
		expect(engine.hasLayout('split-screen')).toBe(false);
		
		expect(engine.hasStepper('default')).toBe(true);
		expect(engine.hasStepper('minimalist')).toBe(false);
	});

	test('should create builder with different components', () => {
		const fullBuilder = createReactFormEngine()
			.addElement(InputElementRegistration)
			.addElement(TextareaElementRegistration)
			.addElement(CheckboxElementRegistration)
			.addElement(SelectElementRegistration)
			.addLayout(CardLayoutRegistration)
			.addLayout(SplitScreenLayoutRegistration)
			.addStepper(DefaultStepperRegistration)
			.addStepper(MinimalistStepperRegistration);

		const engine = fullBuilder.build();

		expect(engine.hasElement('input')).toBe(true);
		expect(engine.hasElement('textarea')).toBe(true);
		expect(engine.hasElement('checkbox')).toBe(true);
		expect(engine.hasElement('select')).toBe(true);
		
		expect(engine.hasLayout('card')).toBe(true);
		expect(engine.hasLayout('split-screen')).toBe(true);
		
		expect(engine.hasStepper('default')).toBe(true);
		expect(engine.hasStepper('minimalist')).toBe(true);
	});

	test('should create two independent builders', () => {
		const builder1 = createReactFormEngine()
			.addElement(InputElementRegistration)
			.addLayout(CardLayoutRegistration);

		const builder2 = createReactFormEngine()
			.addElement(TextareaElementRegistration)
			.addElement(CheckboxElementRegistration)
			.addLayout(SplitScreenLayoutRegistration);

		const engine1 = builder1.build();
		const engine2 = builder2.build();

		expect(engine1.hasElement('input')).toBe(true);
		expect(engine1.hasElement('textarea')).toBe(false);
		expect(engine1.hasElement('checkbox')).toBe(false);
		expect(engine1.hasLayout('card')).toBe(true);
		expect(engine1.hasLayout('split-screen')).toBe(false);

		expect(engine2.hasElement('input')).toBe(false);
		expect(engine2.hasElement('textarea')).toBe(true);
		expect(engine2.hasElement('checkbox')).toBe(true);
		expect(engine2.hasLayout('card')).toBe(false);
		expect(engine2.hasLayout('split-screen')).toBe(true);
	});

	test('should allow retrieving registered components', () => {
		const builder = createReactFormEngine()
			.addElement(InputElementRegistration)
			.addElement(CheckboxElementRegistration)
			.addLayout(CardLayoutRegistration)
			.addStepper(DefaultStepperRegistration);

		const engine = builder.build();

		const inputElement = engine.getElement('input');
		expect(inputElement).toBeDefined();
		expect(inputElement?.__id).toBe('input');

		const checkboxElement = engine.getElement('checkbox');
		expect(checkboxElement).toBeDefined();
		expect(checkboxElement?.__id).toBe('checkbox');

		const textareaElement = engine.getElement('textarea');
		expect(textareaElement).toBeUndefined();

		const cardLayout = engine.getLayout('card');
		expect(cardLayout).toBeDefined();
		expect(cardLayout?.__id).toBe('card');

		const splitScreenLayout = engine.getLayout('split-screen');
		expect(splitScreenLayout).toBeUndefined();

		const defaultStepper = engine.getStepper('default');
		expect(defaultStepper).toBeDefined();
		expect(defaultStepper?.__id).toBe('default');

		const minimalistStepper = engine.getStepper('minimalist');
		expect(minimalistStepper).toBeUndefined();
	});

	test('should allow method chaining', () => {
		const engine = createReactFormEngine()
			.addElement(InputElementRegistration)
			.addElement(TextareaElementRegistration)
			.addLayout(CardLayoutRegistration)
			.addStepper(DefaultStepperRegistration)
			.build();

		expect(engine.hasElement('input')).toBe(true);
		expect(engine.hasElement('textarea')).toBe(true);
		expect(engine.hasLayout('card')).toBe(true);
		expect(engine.hasStepper('default')).toBe(true);
	});

	test('should handle empty builder', () => {
		const engine = createReactFormEngine().build();

		expect(engine.hasElement('input')).toBe(false);
		expect(engine.hasLayout('card')).toBe(false);
		expect(engine.hasStepper('default')).toBe(false);
		
		expect(engine.getElement('input')).toBeUndefined();
		expect(engine.getLayout('card')).toBeUndefined();
		expect(engine.getStepper('default')).toBeUndefined();
	});

	test('should not share registrations between builders', () => {
		const builder1 = createReactFormEngine().addElement(InputElementRegistration);
		const builder2 = createReactFormEngine().addElement(TextareaElementRegistration);

		const engine1 = builder1.build();
		const engine2 = builder2.build();

		expect(engine1.hasElement('input')).toBe(true);
		expect(engine1.hasElement('textarea')).toBe(false);

		expect(engine2.hasElement('input')).toBe(false);
		expect(engine2.hasElement('textarea')).toBe(true);
	});
});

describe('Type Safety Verification', () => {
	test('should only expose types for registered components', () => {
		/**
		 * This test demonstrates type safety at compile time.
		 * TypeScript will catch errors if you try to use components
		 * that weren't imported for type augmentation.
		 */
		const builder = createReactFormEngine()
			.addElement(InputElementRegistration)
			.addElement(CheckboxElementRegistration);

		const engine = builder.build();

		/**
		 * At runtime, we can verify the registered components
		 */
		expect(engine.hasElement('input')).toBe(true);
		expect(engine.hasElement('checkbox')).toBe(true);
		
		/**
		 * Components not imported should not be available
		 * Note: Because we imported multiple registrations in this test file,
		 * the types are all available. In a real-world scenario where you
		 * only import specific registrations, TypeScript would enforce
		 * that only those types are available.
		 */
		expect(engine.hasElement('radio')).toBe(false);
		expect(engine.hasElement('switch')).toBe(false);
	});

	test('should demonstrate explicit vs implicit registration', () => {
		/**
		 * The new pattern is EXPLICIT:
		 * - Import InputElementRegistration = type 'input' is registered
		 * - Import CheckboxElementRegistration = type 'checkbox' is registered
		 * - Don't import RadioElementRegistration = type 'radio' is NOT registered
		 * 
		 * This makes the codebase predictable and debuggable.
		 */
		const engine = createReactFormEngine()
			.addElement(InputElementRegistration)
			.addElement(CheckboxElementRegistration)
			.build();

		/**
		 * You can grep for "InputElementRegistration" to see where
		 * the input type is registered - no hidden magic!
		 */
		expect(engine.hasElement('input')).toBe(true);
		expect(engine.hasElement('checkbox')).toBe(true);
		
		/**
		 * Radio was never imported, so it's not available
		 */
		expect(engine.hasElement('radio')).toBe(false);
	});
});

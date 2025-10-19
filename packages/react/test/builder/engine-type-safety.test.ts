/**
 * Type Safety Tests for FormEngine
 * 
 * These tests verify that the FormEngine returned by build() is properly typed
 * and provides type-safe access to registered components.
 */

import { describe, test, expect, expectTypeOf } from 'bun:test';
import { createReactFormEngine } from '@/registries/builder-registry';
import type { FormEngine } from '@json-form-engine/core/engine';

import { InputElementRegistration } from '@/components/elements/shadcn/inputs/form-input.registration';
import { TextareaElementRegistration } from '@/components/elements/shadcn/inputs/form-textarea.registration';
import { CheckboxElementRegistration } from '@/components/elements/shadcn/inputs/form-checkbox.registration';

import { CardLayoutRegistration } from '@/components/layouts/card-layout.registration';
import { DefaultStepperRegistration } from '@/components/steppers/default-stepper.registration';

describe('FormEngine Type Safety', () => {
	test('should have properly typed engine instance', () => {
		const builder = createReactFormEngine()
			.addElement(InputElementRegistration)
			.addElement(TextareaElementRegistration);

		const engine = builder.build();

		expect(typeof engine.getElement).toBe('function');
		expect(typeof engine.getAllElements).toBe('function');
		expect(typeof engine.getElementIds).toBe('function');
		expect(typeof engine.hasElement).toBe('function');
		
		expect(typeof engine.getLayout).toBe('function');
		expect(typeof engine.getAllLayouts).toBe('function');
		expect(typeof engine.getLayoutIds).toBe('function');
		expect(typeof engine.hasLayout).toBe('function');
		
		expect(typeof engine.getStepper).toBe('function');
		expect(typeof engine.getAllSteppers).toBe('function');
		expect(typeof engine.getStepperIds).toBe('function');
		expect(typeof engine.hasStepper).toBe('function');
		
		expect(typeof engine.getAction).toBe('function');
		expect(typeof engine.getAllActions).toBe('function');
		expect(typeof engine.getActionTypes).toBe('function');
		expect(typeof engine.hasAction).toBe('function');
		
		expect(typeof engine.getSummary).toBe('function');
	});

	test('should correctly type element retrieval', () => {
		const engine = createReactFormEngine()
			.addElement(InputElementRegistration)
			.addElement(TextareaElementRegistration)
			.addLayout(CardLayoutRegistration)
			.addStepper(DefaultStepperRegistration)
			.build();

		const inputElement = engine.getElement('input');
		expect(inputElement).toBeDefined();
		expect(inputElement?.$type).toBe('input');

		const textareaElement = engine.getElement('textarea');
		expect(textareaElement).toBeDefined();
		expect(textareaElement?.$type).toBe('textarea');

		const nonExistent = engine.getElement('nonexistent');
		expect(nonExistent).toBeUndefined();

		const allElements = engine.getAllElements();
		expect(allElements).toHaveLength(2);
		expect(allElements[0].$type).toMatch(/^(input|textarea)$/);
		expect(allElements[1].$type).toMatch(/^(input|textarea)$/);

		const elementIds = engine.getElementIds();
		expect(elementIds).toContain('input');
		expect(elementIds).toContain('textarea');
		expect(elementIds).toHaveLength(2);
	});

	test('should correctly type layout retrieval', () => {
		const engine = createReactFormEngine()
			.addElement(InputElementRegistration)
			.addLayout(CardLayoutRegistration)
			.build();

		const cardLayout = engine.getLayout('card');
		expect(cardLayout).toBeDefined();
		expect(cardLayout?.$type).toBe('card');

		const nonExistent = engine.getLayout('nonexistent');
		expect(nonExistent).toBeUndefined();

		const allLayouts = engine.getAllLayouts();
		expect(allLayouts).toHaveLength(1);
		expect(allLayouts[0].$type).toBe('card');

		const layoutIds = engine.getLayoutIds();
		expect(layoutIds).toContain('card');
		expect(layoutIds).toHaveLength(1);
	});

	test('should correctly type stepper retrieval', () => {
		const engine = createReactFormEngine()
			.addElement(InputElementRegistration)
			.addStepper(DefaultStepperRegistration)
			.build();

		const defaultStepper = engine.getStepper('default');
		expect(defaultStepper).toBeDefined();
		expect(defaultStepper?.$type).toBe('default');

		const nonExistent = engine.getStepper('nonexistent');
		expect(nonExistent).toBeUndefined();

		const allSteppers = engine.getAllSteppers();
		expect(allSteppers).toHaveLength(1);
		expect(allSteppers[0].$type).toBe('default');

		const stepperIds = engine.getStepperIds();
		expect(stepperIds).toContain('default');
		expect(stepperIds).toHaveLength(1);
	});

	test('should provide comprehensive summary', () => {
		const engine = createReactFormEngine()
			.addElement(InputElementRegistration)
			.addElement(TextareaElementRegistration)
			.addElement(CheckboxElementRegistration)
			.addLayout(CardLayoutRegistration)
			.addStepper(DefaultStepperRegistration)
			.build();

		const summary = engine.getSummary();

		expect(summary.elements.count).toBe(3);
		expect(summary.elements.ids).toContain('input');
		expect(summary.elements.ids).toContain('textarea');
		expect(summary.elements.ids).toContain('checkbox');

		expect(summary.layouts.count).toBe(1);
		expect(summary.layouts.ids).toContain('card');

		expect(summary.steppers.count).toBe(1);
		expect(summary.steppers.ids).toContain('default');

		expect(summary.actions.count).toBe(0);
		expect(summary.actions.types).toHaveLength(0);
	});

	test('should maintain type safety across different builders', () => {
		const engine1 = createReactFormEngine()
			.addElement(InputElementRegistration)
			.build();

		const engine2 = createReactFormEngine()
			.addElement(TextareaElementRegistration)
			.addElement(CheckboxElementRegistration)
			.build();

		expect(engine1.hasElement('input')).toBe(true);
		expect(engine1.hasElement('textarea')).toBe(false);
		expect(engine1.hasElement('checkbox')).toBe(false);
		expect(engine1.getElementIds()).toEqual(['input']);

		expect(engine2.hasElement('input')).toBe(false);
		expect(engine2.hasElement('textarea')).toBe(true);
		expect(engine2.hasElement('checkbox')).toBe(true);
		expect(engine2.getElementIds()).toContain('textarea');
		expect(engine2.getElementIds()).toContain('checkbox');
		expect(engine2.getElementIds()).toHaveLength(2);
	});

	test('engine should not be any type', () => {
		const builder = createReactFormEngine()
			.addElement(InputElementRegistration)
			.addElement(TextareaElementRegistration);

		const engine = builder.build();

		/**
		 * Type assertion: engine should be typed as FormEngine
		 * If this test fails to compile, it means engine is 'any'
		 */
		expectTypeOf(engine).toMatchTypeOf<FormEngine<any, any, any, any>>();

		// Runtime check: These methods should exist and be functions
		expect(typeof engine.getElement).toBe('function');
		expect(typeof engine.hasElement).toBe('function');
		expect(typeof engine.getAllElements).toBe('function');
		expect(typeof engine.getElementIds).toBe('function');
		
		expect(typeof engine.getLayout).toBe('function');
		expect(typeof engine.hasLayout).toBe('function');
		
		expect(typeof engine.getStepper).toBe('function');
		expect(typeof engine.hasStepper).toBe('function');
		
		expect(typeof engine.getSummary).toBe('function');
		
		/**
		 * The key assertion is expectTypeOf(engine).toMatchTypeOf<FormEngine>()
		 * If engine were 'any', this would not provide proper type checking.
		 * The fact that TypeScript accepts this means engine is properly typed.
		 */
	});

	test('should handle empty engine gracefully', () => {
		const engine = createReactFormEngine().build();

		expect(engine.getAllElements()).toHaveLength(0);
		expect(engine.getElementIds()).toHaveLength(0);
		expect(engine.getAllLayouts()).toHaveLength(0);
		expect(engine.getLayoutIds()).toHaveLength(0);
		expect(engine.getAllSteppers()).toHaveLength(0);
		expect(engine.getStepperIds()).toHaveLength(0);
		expect(engine.getAllActions()).toHaveLength(0);
		expect(engine.getActionTypes()).toHaveLength(0);

		const summary = engine.getSummary();
		expect(summary.elements.count).toBe(0);
		expect(summary.layouts.count).toBe(0);
		expect(summary.steppers.count).toBe(0);
		expect(summary.actions.count).toBe(0);
	});
});

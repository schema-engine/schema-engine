/**
 * Tests for Multiple Builders with Different Components (Type Isolation)
 *
 * This test verifies that the per-component registration pattern allows
 * multiple FormComposer instances in the same codebase with different
 * component sets, where types accurately reflect what each builder has registered.
 */

import { describe, test, expect } from 'vitest';
import { createReactFormComposer } from '@/registries/builder-registry';
import { FormComposer } from '@schema-engine/forms/builder';

import { InputElementRegistration } from '@/components/schema-engine/forms/inputs/form-input.registration';
import { TextareaElementRegistration } from '@/components/schema-engine/forms/inputs/form-textarea.registration';
import { CheckboxElementRegistration } from '@/components/schema-engine/forms/inputs/form-checkbox.registration';
import { SelectElementRegistration } from '@/components/schema-engine/forms/inputs/form-select.registration';

describe('Multiple Builders Type Isolation', () => {
	test('should create builder with only input and textarea', () => {
		const engine = createReactFormComposer()
			.addElement(InputElementRegistration)
			.addElement(TextareaElementRegistration)
			.build();

		expect(engine.hasElement('input')).toBe(true);
		expect(engine.hasElement('textarea')).toBe(true);
		expect(engine.hasElement('checkbox')).toBe(false);
		expect(engine.hasElement('select')).toBe(false);
		expect(engine.hasRecipe('card')).toBe(false);
	});

	test('should create builder with different components', () => {
		const engine = createReactFormComposer()
			.addElement(InputElementRegistration)
			.addElement(TextareaElementRegistration)
			.addElement(CheckboxElementRegistration)
			.addElement(SelectElementRegistration)
			.build();

		expect(engine.hasElement('input')).toBe(true);
		expect(engine.hasElement('checkbox')).toBe(true);
		expect(engine.hasElement('select')).toBe(true);
		expect(engine.hasRecipe('wizard')).toBe(false);
	});

	test('should create two independent builders', () => {
		const engine1 = createReactFormComposer().addElement(InputElementRegistration).build();
		const engine2 = createReactFormComposer()
			.addElement(TextareaElementRegistration)
			.addElement(CheckboxElementRegistration)
			.build();

		expect(engine1.hasElement('input')).toBe(true);
		expect(engine1.hasElement('textarea')).toBe(false);
		expect(engine1.hasElement('checkbox')).toBe(false);

		expect(engine2.hasElement('input')).toBe(false);
		expect(engine2.hasElement('textarea')).toBe(true);
		expect(engine2.hasElement('checkbox')).toBe(true);
	});

	test('should allow retrieving registered components', () => {
		const engine = createReactFormComposer()
			.addElement(InputElementRegistration)
			.addElement(CheckboxElementRegistration)
			.build();

		expect(engine.getElement('input')?.$type).toBe('input');
		expect(engine.getElement('checkbox')?.$type).toBe('checkbox');
		expect(engine.getElement('textarea')).toBeUndefined();
		expect(engine.getRecipe('card')).toBeUndefined();
	});

	test('should allow method chaining', () => {
		const engine = createReactFormComposer()
			.addElement(InputElementRegistration)
			.addElement(TextareaElementRegistration)
			.build();

		expect(engine.hasElement('input')).toBe(true);
		expect(engine.hasElement('textarea')).toBe(true);
	});

	test('core FormComposer does not register React recipes', () => {
		const engine = new FormComposer().build();

		expect(engine.hasElement('input')).toBe(false);
		expect(engine.hasRecipe('card')).toBe(false);
		expect(engine.getRecipe('card')).toBeUndefined();
	});

	test('should not share element registrations between builders', () => {
		const engine1 = createReactFormComposer().addElement(InputElementRegistration).build();
		const engine2 = createReactFormComposer().addElement(TextareaElementRegistration).build();

		expect(engine1.hasElement('input')).toBe(true);
		expect(engine1.hasElement('textarea')).toBe(false);

		expect(engine2.hasElement('input')).toBe(false);
		expect(engine2.hasElement('textarea')).toBe(true);
	});
});

describe('Type Safety Verification', () => {
	test('should only expose types for registered components', () => {
		const engine = createReactFormComposer()
			.addElement(InputElementRegistration)
			.addElement(CheckboxElementRegistration)
			.build();

		expect(engine.hasElement('input')).toBe(true);
		expect(engine.hasElement('checkbox')).toBe(true);
		expect(engine.hasElement('radio')).toBe(false);
		expect(engine.hasElement('switch')).toBe(false);
	});
});

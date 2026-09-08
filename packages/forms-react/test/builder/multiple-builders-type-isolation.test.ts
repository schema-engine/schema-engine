/**
 * Tests for multiple engines with different component registrations (type isolation)
 */

import { describe, test, expect } from 'vitest';
import { createReactFormEngine } from '@/registries/builder-registry';
import { createFormEngine } from '@schema-engine/forms';

import { InputElementRegistration } from '@/components/schema-engine/forms/inputs/form-input.registration';
import { TextareaElementRegistration } from '@/components/schema-engine/forms/inputs/form-textarea.registration';
import { CheckboxElementRegistration } from '@/components/schema-engine/forms/inputs/form-checkbox.registration';
import { SelectElementRegistration } from '@/components/schema-engine/forms/inputs/form-select.registration';

describe('Multiple engines type isolation', () => {
	test('should create an engine with only input and textarea', () => {
		const engine = createReactFormEngine({
			elements: [InputElementRegistration, TextareaElementRegistration],
		});

		expect(engine.hasElement('input')).toBe(true);
		expect(engine.hasElement('textarea')).toBe(true);
		expect(engine.hasElement('checkbox')).toBe(false);
		expect(engine.hasElement('select')).toBe(false);
		expect(engine.hasRecipe('card')).toBe(false);
	});

	test('should create an engine with different components', () => {
		const engine = createReactFormEngine({
			elements: [
				InputElementRegistration,
				TextareaElementRegistration,
				CheckboxElementRegistration,
				SelectElementRegistration,
			],
		});

		expect(engine.hasElement('input')).toBe(true);
		expect(engine.hasElement('checkbox')).toBe(true);
		expect(engine.hasElement('select')).toBe(true);
		expect(engine.hasRecipe('wizard')).toBe(false);
	});

	test('should create two independent engines', () => {
		const engine1 = createReactFormEngine({ elements: [InputElementRegistration] });
		const engine2 = createReactFormEngine({
			elements: [TextareaElementRegistration, CheckboxElementRegistration],
		});

		expect(engine1.hasElement('input')).toBe(true);
		expect(engine1.hasElement('textarea')).toBe(false);
		expect(engine1.hasElement('checkbox')).toBe(false);

		expect(engine2.hasElement('input')).toBe(false);
		expect(engine2.hasElement('textarea')).toBe(true);
		expect(engine2.hasElement('checkbox')).toBe(true);
	});

	test('should allow retrieving registered components', () => {
		const engine = createReactFormEngine({
			elements: [InputElementRegistration, CheckboxElementRegistration],
		});

		expect(engine.getElement('input')?.$type).toBe('input');
		expect(engine.getElement('checkbox')?.$type).toBe('checkbox');
		expect(engine.getElement('textarea')).toBeUndefined();
		expect(engine.getRecipe('card')).toBeUndefined();
	});

	test('headless createFormEngine does not register React recipes', () => {
		const engine = createFormEngine();

		expect(engine.hasElement('input')).toBe(false);
		expect(engine.hasRecipe('card')).toBe(false);
		expect(engine.getRecipe('card')).toBeUndefined();
	});

	test('should not share element registrations between engines', () => {
		const engine1 = createReactFormEngine({ elements: [InputElementRegistration] });
		const engine2 = createReactFormEngine({ elements: [TextareaElementRegistration] });

		expect(engine1.hasElement('input')).toBe(true);
		expect(engine1.hasElement('textarea')).toBe(false);

		expect(engine2.hasElement('input')).toBe(false);
		expect(engine2.hasElement('textarea')).toBe(true);
	});
});

describe('Type safety verification', () => {
	test('should only expose types for registered components', () => {
		const engine = createReactFormEngine({
			elements: [InputElementRegistration, CheckboxElementRegistration],
		});

		expect(engine.hasElement('input')).toBe(true);
		expect(engine.hasElement('checkbox')).toBe(true);
		expect(engine.hasElement('radio')).toBe(false);
		expect(engine.hasElement('switch')).toBe(false);
	});
});

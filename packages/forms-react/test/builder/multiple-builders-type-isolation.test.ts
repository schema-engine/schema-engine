/**
 * Tests for multiple engines with different component registrations (type isolation)
 */

import { describe, test, expect } from 'vitest';
import { createFormEngine } from '@schema-engine/forms';

import { InputElementRegistration } from '@/components/schema-engine/forms/inputs/form-input.registration';
import { TextareaElementRegistration } from '@/components/schema-engine/forms/inputs/form-textarea.registration';
import { CheckboxElementRegistration } from '@/components/schema-engine/forms/inputs/form-checkbox.registration';
import { SelectElementRegistration } from '@/components/schema-engine/forms/inputs/form-select.registration';

describe('Multiple engines type isolation', () => {
	test('should create an engine with only input and textarea', () => {
		const engine = createFormEngine({
			elements: [InputElementRegistration, TextareaElementRegistration],
		});

		expect(engine.elements.has('input')).toBe(true);
		expect(engine.elements.has('textarea')).toBe(true);
		expect(engine.elements.has('checkbox')).toBe(false);
		expect(engine.elements.has('select')).toBe(false);
		expect(engine.recipes.has('card')).toBe(false);
	});

	test('should create an engine with different components', () => {
		const engine = createFormEngine({
			elements: [
				InputElementRegistration,
				TextareaElementRegistration,
				CheckboxElementRegistration,
				SelectElementRegistration,
			],
		});

		expect(engine.elements.has('input')).toBe(true);
		expect(engine.elements.has('checkbox')).toBe(true);
		expect(engine.elements.has('select')).toBe(true);
		expect(engine.recipes.has('wizard')).toBe(false);
	});

	test('should create two independent engines', () => {
		const engine1 = createFormEngine({ elements: [InputElementRegistration] });
		const engine2 = createFormEngine({
			elements: [TextareaElementRegistration, CheckboxElementRegistration],
		});

		expect(engine1.elements.has('input')).toBe(true);
		expect(engine1.elements.has('textarea')).toBe(false);
		expect(engine1.elements.has('checkbox')).toBe(false);

		expect(engine2.elements.has('input')).toBe(false);
		expect(engine2.elements.has('textarea')).toBe(true);
		expect(engine2.elements.has('checkbox')).toBe(true);
	});

	test('should allow retrieving registered components', () => {
		const engine = createFormEngine({
			elements: [InputElementRegistration, CheckboxElementRegistration],
		});

		expect(engine.elements.get('input')?.$type).toBe('input');
		expect(engine.elements.get('checkbox')?.$type).toBe('checkbox');
		expect(engine.elements.get('textarea')).toBeUndefined();
		expect(engine.recipes.get('card')).toBeUndefined();
	});

	test('headless createFormEngine does not register React recipes', () => {
		const engine = createFormEngine();

		expect(engine.elements.has('input')).toBe(false);
		expect(engine.recipes.has('card')).toBe(false);
		expect(engine.recipes.get('card')).toBeUndefined();
	});

	test('should not share element registrations between engines', () => {
		const engine1 = createFormEngine({ elements: [InputElementRegistration] });
		const engine2 = createFormEngine({ elements: [TextareaElementRegistration] });

		expect(engine1.elements.has('input')).toBe(true);
		expect(engine1.elements.has('textarea')).toBe(false);

		expect(engine2.elements.has('input')).toBe(false);
		expect(engine2.elements.has('textarea')).toBe(true);
	});
});

describe('Type safety verification', () => {
	test('should only expose types for registered components', () => {
		const engine = createFormEngine({
			elements: [InputElementRegistration, CheckboxElementRegistration],
		});

		expect(engine.elements.has('input')).toBe(true);
		expect(engine.elements.has('checkbox')).toBe(true);
		expect(engine.elements.has('radio')).toBe(false);
		expect(engine.elements.has('switch')).toBe(false);
	});
});

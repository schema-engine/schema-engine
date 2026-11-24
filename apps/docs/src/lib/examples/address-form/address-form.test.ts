import { readFileSync } from 'node:fs';
import { describe, expect, test } from 'vitest';
import { createRadiantFormEngine, schemaFormRegistrations } from '@schema-engine/forms-radiant';
import { addressForm } from './config';

const css = readFileSync(new URL('./address-form.css', import.meta.url), 'utf8');
const engine = createRadiantFormEngine({ elements: schemaFormRegistrations });

describe('the address fieldset', () => {
	test('is a valid form in the Radiant engine', () => {
		expect(engine.safeValidateForm(addressForm)).toMatchObject({ success: true });
	});

	test('places its children on its own grid, with widths and no columns on the step', () => {
		const [fieldset] = addressForm.steps[0]!.elements;
		expect(fieldset).toMatchObject({ $type: 'fieldSet' });
		const children =
			'elements' in fieldset! ? (fieldset.elements as { id: string; grid?: { width?: string } }[]) : [];
		expect(Object.fromEntries(children.map((child) => [child.id, child.grid?.width]))).toEqual({
			street: undefined,
			city: 'two-thirds',
			zip: 'third',
			region: 'half',
			country: 'half',
		});
		expect(addressForm.steps[0]).not.toHaveProperty('columns');
	});

	test('is styled by the class the config puts on the form, and no other', () => {
		expect(addressForm.className).toBe('address-form');
		expect(css.match(/^[.#][\w-]+/gm)).toEqual(['.address-form']);
	});
});

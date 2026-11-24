import { readFileSync } from 'node:fs';
import { describe, expect, test } from 'vitest';
import { createRadiantFormEngine, schemaFormRegistrations } from '@schema-engine/forms-radiant';
import { contactCard } from './config';

const css = readFileSync(new URL('./contact-card.css', import.meta.url), 'utf8');
const engine = createRadiantFormEngine({ elements: schemaFormRegistrations });

describe('the contact card', () => {
	test('is a valid form in the Radiant engine', () => {
		expect(engine.safeValidateForm(contactCard)).toMatchObject({ success: true });
	});

	test('puts the two names on a half-width pair and lets the others fill the row', () => {
		const fields = engine.validateForm(contactCard).steps[0]!.elements;
		const widths = Object.fromEntries(fields.map((field) => [field.id, field.grid?.width]));
		expect(widths).toEqual({ first: 'half', last: 'half', email: undefined, message: undefined });
	});

	test('is styled by the class the config puts on the form, and no other', () => {
		expect(contactCard.className).toBe('contact-card');
		expect(css.match(/^[.#][\w-]+/gm)).toEqual(['.contact-card']);
	});
});

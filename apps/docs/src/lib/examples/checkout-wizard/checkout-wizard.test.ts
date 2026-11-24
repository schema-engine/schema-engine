import { readFileSync } from 'node:fs';
import { describe, expect, test } from 'vitest';
import { createRadiantFormEngine, schemaFormRegistrations } from '@schema-engine/forms-radiant';
import { checkoutWizard } from './config';

const css = readFileSync(new URL('./checkout-wizard.css', import.meta.url), 'utf8');
const engine = createRadiantFormEngine({ elements: schemaFormRegistrations });

describe('the checkout wizard', () => {
	test('is a valid form in the Radiant engine', () => {
		expect(engine.safeValidateForm(checkoutWizard)).toMatchObject({ success: true });
	});

	test('draws each step its own areas, and every field claims one of its own step', () => {
		expect(checkoutWizard.steps).toHaveLength(2);
		for (const step of checkoutWizard.steps) {
			const areas = new Set(((step.grid as { areas: string[] }).areas ?? []).flatMap((row) => row.split(' ')));
			const claimed = step.elements.map((element) => (element as { grid?: { area?: string } }).grid?.area);
			expect(claimed.length).toBeGreaterThan(0);
			for (const area of claimed) expect(areas, `${step.id} claims ${area}`).toContain(area);
		}
	});

	test('is styled by the class the config puts on the form, and no other', () => {
		expect(checkoutWizard.className).toBe('checkout-wizard');
		expect(css.match(/^[.#][\w-]+/gm)).toEqual(['.checkout-wizard']);
	});
});

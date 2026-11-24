import { readFileSync } from 'node:fs';
import { describe, expect, test } from 'vitest';
import { createRadiantFormEngine, schemaFormRegistrations } from '@schema-engine/forms-radiant';
import { drawnLayout } from './config';

const css = readFileSync(new URL('./drawn-layout.css', import.meta.url), 'utf8');
const engine = createRadiantFormEngine({ elements: schemaFormRegistrations });

describe('the drawn layout', () => {
	test('is a valid form in the Radiant engine', () => {
		expect(engine.safeValidateForm(drawnLayout)).toMatchObject({ success: true });
	});

	test('draws a template for default and md, and each draws every field', () => {
		const areas = (drawnLayout.grid as { areas: Record<string, string[]> }).areas;
		expect(Object.keys(areas)).toEqual(['default', 'md']);
		const fields = drawnLayout.steps[0]!.elements.map((element) => (element as { id: string }).id);
		for (const [breakpoint, rows] of Object.entries(areas)) {
			expect(new Set(rows.flatMap((row) => row.split(' '))), breakpoint).toEqual(new Set(fields));
		}
	});

	test('is styled by the class the config puts on the form, and no other', () => {
		expect(drawnLayout.className).toBe('drawn-layout');
		expect(css.match(/^[.#][\w-]+/gm)).toEqual(['.drawn-layout']);
	});
});

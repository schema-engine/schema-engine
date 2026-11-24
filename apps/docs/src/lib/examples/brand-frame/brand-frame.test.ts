import { readFileSync } from 'node:fs';
import { describe, expect, test } from 'vitest';
import { createRadiantFormEngine, schemaFormRegistrations } from '@schema-engine/forms-radiant';
import { brandFrameForm } from './config';
import { BrandFrameRecipe as RadiantRecipe } from './brand-frame.radiant';
import { BrandFrameRecipe as ReactRecipe } from './brand-frame.react';

const read = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8');
const css = read('./brand-frame.css');

describe('the brand frame', () => {
	test('is a valid form once the engine registers the recipe, and not before', () => {
		const plain = createRadiantFormEngine({ elements: schemaFormRegistrations });
		const framed = createRadiantFormEngine({ elements: schemaFormRegistrations, recipes: [RadiantRecipe] });
		expect(framed.safeValidateForm(brandFrameForm)).toMatchObject({ success: true });
		expect(plain.safeValidateForm(brandFrameForm)).toMatchObject({ success: false });
	});

	test('both renderers bind the same spec, so one config selects either', () => {
		expect(ReactRecipe.$type).toBe('brand-frame');
		expect(RadiantRecipe.$type).toBe('brand-frame');
		expect(brandFrameForm.view).toMatchObject({ $type: 'brand-frame', shell: { label: 'Newsletter' } });
	});

	test('the CSS styles the classes both shells write', () => {
		const classes = [...css.matchAll(/^\.([\w-]+)/gm)].map((match) => match[1]!);
		expect(classes).toEqual(['brand-frame', 'brand-frame__label', 'brand-frame__body']);
		for (const file of ['./brand-frame.react.tsx', './brand-frame.radiant.tsx']) {
			for (const name of classes) expect(read(file), `${file} writes ${name}`).toContain(`"${name}"`);
		}
	});
});

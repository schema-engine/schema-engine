import { readFileSync } from 'node:fs';
import { describe, expect, test } from 'vitest';
import { createRadiantFormEngine, schemaFormRegistrations } from '@schema-engine/forms-radiant';
import { brandForm } from './config';
import { brandTheme, tone } from './theme';

const css = readFileSync(new URL('./brand-tone.css', import.meta.url), 'utf8');

describe('the brand theme', () => {
	test('adds the tone axis to the built-in ones, and a form picks it', () => {
		expect(brandTheme.axes.tone).toEqual(['neutral', 'brand', 'forest']);
		expect(Object.keys(brandTheme.axes)).toEqual(expect.arrayContaining(['size', 'surface', 'tone']));
		expect(tone.values['brand']).toMatchObject({ '--primary': '#c2410c' });
		expect(brandForm.appearance).toEqual({ tone: 'brand' });
	});

	test('is a valid form only in an engine built on the theme', () => {
		const themed = createRadiantFormEngine({ elements: schemaFormRegistrations, layout: brandTheme });
		const plain = createRadiantFormEngine({ elements: schemaFormRegistrations });
		expect(themed.safeValidateForm(brandForm)).toMatchObject({ success: true });
		expect(() => plain.validateForm(brandForm)).toThrow(/Unknown axis 'tone'/);
	});

	test('is styled by the class of the config, and keys one rule on the attribute the renderer writes', () => {
		expect(brandForm.className).toBe('brand-form');
		expect(css.match(/^\.[\w-]+/gm)).toEqual(['.brand-form', '.brand-form']);
		expect(css).toContain("[data-se-tone='forest']");
	});
});

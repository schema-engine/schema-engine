import { readFileSync } from 'node:fs';
import { describe, expect, test } from 'vitest';
import { builtInAxes } from '@schema-engine/layout';
import { createRadiantFormEngine, schemaFormRegistrations } from '@schema-engine/forms-radiant';
import { themedForm } from './config';
import { engine } from './engine';
import { theme, tone } from './theme';

const css = readFileSync(new URL('./themed.css', import.meta.url), 'utf8');
const [size] = builtInAxes;

describe('the theme', () => {
	test('adds the tone axis to the built-in ones, and the form picks values of three axes', () => {
		expect(theme.axes.tone).toEqual(['neutral', 'brand', 'forest']);
		expect(Object.keys(theme.axes)).toEqual(expect.arrayContaining(['size', 'surface', 'tone']));
		expect(tone.values['brand']).toMatchObject({ '--primary': '#c2410c' });
		expect(themedForm.appearance).toEqual({ tone: 'brand' });
		expect(themedForm.view).toMatchObject({ shell: { appearance: { size: 'compact', surface: 'outlined' } } });
	});

	test('is valid in an engine built on the theme and fails in one that is not', () => {
		const plain = createRadiantFormEngine({ elements: schemaFormRegistrations });
		expect(engine.safeValidateForm(themedForm)).toMatchObject({ success: true });
		expect(() => plain.validateForm(themedForm)).toThrow(/Unknown axis 'tone'/);
	});

	test('is the one theme of every engine it is passed to, so every form carries one theme id', () => {
		const other = createRadiantFormEngine({ elements: schemaFormRegistrations, layout: theme });
		expect(engine.getLayout()).toBe(theme);
		expect(other.getLayout()).toBe(engine.getLayout());
	});
});

describe('the stylesheet', () => {
	test('is scoped by the class the config puts on the form, and no other', () => {
		expect(themedForm.className).toBe('themed');
		expect(css.match(/^\.[\w-]+/gm)).toEqual(['.themed', '.themed', '.themed']);
	});

	test('sets the hooks the compact size reads, the measure it sets and the gap token of the grid', () => {
		const compact = Object.values(size.values.compact).join(' ');
		const hooks = [...css.matchAll(/(--se-[\w-]+-compact):/g)].map((match) => match[1]!);
		expect(hooks.toSorted()).toEqual(['--se-control-height-compact', '--se-space-compact']);
		for (const hook of hooks) expect(compact, hook).toContain(`var(${hook},`);
		expect(Object.keys(size.values.compact)).toContain('--se-measure');
		expect(css).toContain('--se-measure:');
		expect(css).toContain('--se-grid-gap-default:');
	});

	test('keys a rule on the tone attribute the renderer writes, and reads the colour role the axis sets', () => {
		expect(css).toContain("[data-se-tone='brand']");
		expect(css).toContain('var(--primary)');
		expect(css).not.toMatch(/--primary:/);
	});
});

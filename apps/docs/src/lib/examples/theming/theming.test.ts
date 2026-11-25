import { readFileSync } from 'node:fs';
import { describe, expect, test } from 'vitest';
import { builtInAxes } from '@schema-engine/layout';
import { createRadiantFormEngine, schemaFormRegistrations } from '@schema-engine/forms-radiant';
import { themedForm } from './config';
import { engine as radiantEngine } from './theming.radiant';
import { engine as reactEngine } from './theming.react';
import { font, shape, tone } from './theme';

const css = readFileSync(new URL('./themed.css', import.meta.url), 'utf8');
const size = builtInAxes.find((axis) => axis.$type === 'size')!;

/** Relative luminance of a `#rrggbb` colour, as WCAG 2 defines it. */
function luminance(hex: string): number {
	const [red, green, blue] = [1, 3, 5].map((start) => {
		const channel = Number.parseInt(hex.slice(start, start + 2), 16) / 255;
		return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
	});
	return 0.2126 * red! + 0.7152 * green! + 0.0722 * blue!;
}

function contrast(foreground: string, background: string): number {
	const [light, dark] = [luminance(foreground), luminance(background)].toSorted((a, b) => b - a);
	return (light! + 0.05) / (dark! + 0.05);
}

describe('the themed form', () => {
	test.each([
		['React', reactEngine],
		['Radiant', radiantEngine],
	])('is valid in the %s engine built on the theme', (_renderer, engine) => {
		expect(engine.safeValidateForm(themedForm)).toMatchObject({ success: true });
	});

	test('fails in an engine that is not built on the theme', () => {
		const plain = createRadiantFormEngine({ elements: schemaFormRegistrations });
		expect(() => plain.validateForm(themedForm)).toThrow(/Unknown axis 'tone'/);
	});

	test.each([
		['React', reactEngine],
		['Radiant', radiantEngine],
	])(
		'accepts the show_notification entry of the config, so a config naming an unregistered action fails, in the %s engine',
		(_renderer, engine) => {
			const result = engine.safeValidateForm(themedForm);
			expect(result.success && result.data.actions).toMatchObject([
				{
					$type: 'show_notification',
					message: 'Account created.',
					variant: 'success',
					triggers: ['form_submit_success'],
				},
			]);
		},
	);
});

describe('the stylesheet', () => {
	test('sets only hooks the compact size of the theme reads', () => {
		const compact = Object.values(size.values.compact).join(' ');
		const hooks = [...css.matchAll(/(--se-[\w-]+-compact):/g)].map((match) => match[1]!);
		expect(hooks.length).toBeGreaterThan(0);
		for (const hook of hooks) expect(compact, hook).toContain(`var(${hook},`);
	});
});

describe('the tone axis', () => {
	const accents = Object.entries(tone.values).filter(([value]) => value !== 'neutral');

	test('has the neutral default and four accents, the most an axis holds', () => {
		expect(tone.default).toBe('neutral');
		expect(tone.values.neutral).toEqual({});
		expect(accents.map(([value]) => value)).toEqual(['brand', 'forest', 'violet', 'ocean']);
	});

	test.each(accents)(
		'%s reads at least 4.5:1 with white text on its primary and 4.5:1 on its container',
		(_name, tokens) => {
			const values = tokens as Record<string, string>;
			expect(values['--on-primary']).toBe('#ffffff');
			expect(values['--primary-foreground']).toBe('#ffffff');
			expect(contrast('#ffffff', values['--primary']!)).toBeGreaterThanOrEqual(4.5);
			expect(contrast(values['--on-primary-container']!, values['--primary-container']!)).toBeGreaterThanOrEqual(
				4.5,
			);
		},
	);
});

describe('the shape axis', () => {
	test('defaults to the radius of the host theme, so a form that picks nothing is unchanged', () => {
		expect(shape.default).toBe('rounded');
		expect(shape.values.rounded).toEqual({});
	});

	test('sets the radius tokens Radiant UI and a shadcn theme read', () => {
		for (const value of ['sharp', 'pill'] as const) {
			expect(Object.keys(shape.values[value]).toSorted()).toEqual([
				'--radius',
				'--radius-button',
				'--radius-container',
				'--radius-control',
			]);
		}
		expect(shape.values.sharp['--radius-control']).toBe('0');
	});
});

describe('the font axis', () => {
	test('defaults to the typeface of the host theme and sets the font roles from system stacks only', () => {
		expect(font.default).toBe('sans');
		expect(font.values.sans).toEqual({});
		for (const value of ['serif', 'mono'] as const) {
			expect(Object.keys(font.values[value]).toSorted()).toEqual(['--font-heading', '--font-sans']);
			expect(Object.values(font.values[value]).join(' ')).not.toMatch(/url\(|@font-face/);
		}
		expect(font.values.serif['--font-sans']).toContain('ui-serif');
		expect(font.values.mono['--font-sans']).toContain('ui-monospace');
	});
});

describe('the stylesheet and the font axis', () => {
	test('sets the font-family of the form from the role the axis sets', () => {
		expect(css).toMatch(/\.themed \{\s*font-family: var\(--font-sans\);/);
	});
});

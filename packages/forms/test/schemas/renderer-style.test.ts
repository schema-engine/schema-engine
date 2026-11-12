import { describe, expect, test } from 'vitest';
import * as z from 'zod/mini';
import { createFormEngine } from '@/engine/create-form-engine';
import { BaseFieldSchema, RendererStyleSchema } from '@/schemas/base-field';
import { defineInput } from '@/types';

const noteElement = defineInput({
	$type: 'note',
	schema: z.extend(BaseFieldSchema, { $type: z.literal('note') }),
	metadata: { name: 'Note', category: 'input' },
	render: () => null,
});

const engine = createFormEngine({ elements: [noteElement] });

const formWith = (overrides: { form?: object; step?: object; field?: object }) => ({
	id: 'styled',
	...overrides.form,
	steps: [
		{
			id: 'main',
			title: 'Main',
			...overrides.step,
			elements: [{ $type: 'note', id: 'note', name: 'note', ...overrides.field }],
		},
	],
});

describe('RendererStyleSchema', () => {
	test('accepts custom properties with string and number values', () => {
		expect(z.safeParse(RendererStyleSchema, { '--accent': '#f60', '--columns': 2 }).success).toBe(true);
	});

	test.each([
		['a camelCase property', { maxWidth: '10rem' }],
		['a kebab-case property', { 'max-width': '10rem' }],
		['a single dash', { '-accent': '#f60' }],
	])('rejects %s, naming the key', (_name, style) => {
		const result = z.safeParse(RendererStyleSchema, style);
		expect(result.success).toBe(false);
		const message = JSON.stringify(result.error?.issues);
		expect(message).toContain('CSS custom properties');
		expect(message).toContain(Object.keys(style)[0]);
	});

	test('rejects the key "--", saying the property name is empty', () => {
		const result = z.safeParse(RendererStyleSchema, { '--': '1' });
		expect(result.success).toBe(false);
		const message = JSON.stringify(result.error?.issues);
		expect(message).toContain('must not be empty');
		expect(message).not.toContain("must start with '--'");
	});

	test.each([
		['a semicolon', '1rem; color: red'],
		['an opening brace', '1rem {'],
		['a closing brace', '1rem }'],
	])('rejects a value with %s, naming the key', (_name, value) => {
		const result = z.safeParse(RendererStyleSchema, { '--gap': value });
		expect(result.success).toBe(false);
		const message = JSON.stringify(result.error?.issues);
		expect(message).toContain('--gap');
		expect(message).toContain('declaration');
	});

	test('accepts values that merely look like CSS', () => {
		expect(z.safeParse(RendererStyleSchema, { '--url': 'url("a.png")', '--font': '"A, B", serif' }).success).toBe(
			true,
		);
	});

	test.each([
		['an object', { '--accent': { nested: true } }],
		['a boolean', { '--accent': true }],
		['undefined', { '--accent': undefined }],
	])('rejects %s as a value', (_name, style) => {
		expect(z.safeParse(RendererStyleSchema, style).success).toBe(false);
	});
});

describe('style on form, step and field', () => {
	test('validation keeps custom properties on all three', () => {
		const config = engine.validateForm(
			formWith({
				form: { style: { '--gap': '2rem' } },
				step: { style: { '--accent': '#f60' } },
				field: { style: { '--gap': 2 } },
			}),
		);
		expect(config.style).toEqual({ '--gap': '2rem' });
		expect(config.steps[0].style).toEqual({ '--accent': '#f60' });
		expect(config.steps[0].elements[0].style).toEqual({ '--gap': 2 });
	});

	test.each([
		['a field', { field: { style: { maxWidth: '10rem' } } }],
		['a step', { step: { style: { maxWidth: '10rem' } } }],
		['the form', { form: { style: { maxWidth: '10rem' } } }],
	])('%s with a non-custom-property key fails validation', (_name, overrides) => {
		expect(() => engine.validateForm(formWith(overrides))).toThrowError(/CSS custom properties only.*maxWidth/s);
	});
});

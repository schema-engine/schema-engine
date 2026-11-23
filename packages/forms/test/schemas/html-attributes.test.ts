import { describe, expect, test } from 'vitest';
import * as z from 'zod/mini';
import { createFormEngine } from '@/engine/create-form-engine';
import { defineInput } from '@/types';
import { BaseFieldSchema } from '@/schemas/base-field';
import { mergeControlProps, HtmlAttributesSchema } from '@/schemas/html-attributes';
import { anyValue } from '../lib/any-value';

describe('HtmlAttributesSchema', () => {
	test('accepts JSON-safe control attributes', () => {
		const result = HtmlAttributesSchema.safeParse({
			'data-testid': 'email',
			autoCapitalize: 'off',
			tabIndex: 0,
		});

		expect(result.success).toBe(true);
	});

	test('rejects reserved control keys', () => {
		expect(HtmlAttributesSchema.safeParse({ id: 'custom' }).success).toBe(false);
		expect(HtmlAttributesSchema.safeParse({ $type: 'input' }).success).toBe(false);
		expect(HtmlAttributesSchema.safeParse({ className: 'x' }).success).toBe(false);
	});

	test('rejects event handler keys', () => {
		expect(HtmlAttributesSchema.safeParse({ onClick: 'noop' }).success).toBe(false);
		expect(HtmlAttributesSchema.safeParse({ onclick: 'noop' }).success).toBe(false);
	});
});

describe('mergeControlProps', () => {
	test('merges authored attributes under engine control props', () => {
		expect(
			mergeControlProps({ id: 'engine-id', name: 'email' }, { id: 'author-id', 'data-testid': 'email-field' }),
		).toEqual({
			'data-testid': 'email-field',
			id: 'engine-id',
			name: 'email',
		});
	});

	test('drops undefined bag entries', () => {
		expect(mergeControlProps({ id: 'x' }, { 'data-testid': undefined, title: 'hint' })).toEqual({
			title: 'hint',
			id: 'x',
		});
	});
});

describe('BaseFieldSchema htmlAttributes', () => {
	const probeSchema = z.extend(BaseFieldSchema, {
		$type: z.literal('probe'),
	});

	const probeElement = defineInput({
		value: anyValue,
		$type: 'probe',
		schema: probeSchema,
		metadata: { name: 'Probe', category: 'input' },
		render: () => null,
	});

	test('round-trips through defineForm', () => {
		const engine = createFormEngine({ elements: [probeElement] });
		const config = engine.defineForm({
			id: 'probe-form',
			steps: [
				{
					id: 'main',
					title: 'Main',
					elements: [
						{
							$type: 'probe',
							name: 'email',
							id: 'email',
							htmlAttributes: { 'data-testid': 'email-input' },
						},
					],
				},
			],
		});

		expect(config.steps[0]?.elements[0]).toMatchObject({
			htmlAttributes: { 'data-testid': 'email-input' },
		});
	});

	test('strips undeclared top-level data attributes', () => {
		const engine = createFormEngine({ elements: [probeElement] });
		const config = engine.defineForm({
			id: 'probe-form',
			steps: [
				{
					id: 'main',
					title: 'Main',
					elements: [
						{
							$type: 'probe',
							name: 'email',
							id: 'email',
							'data-testid': 'lost',
							htmlAttributes: { 'data-testid': 'kept' },
						} as never,
					],
				},
			],
		});

		expect(config.steps[0]?.elements[0]).toMatchObject({
			htmlAttributes: { 'data-testid': 'kept' },
		});
		expect(config.steps[0]?.elements[0]).not.toHaveProperty('data-testid');
	});
});

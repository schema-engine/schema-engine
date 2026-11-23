import { describe, expect, test } from 'vitest';
import * as z from 'zod/mini';
import { createFormEngine } from '@/engine/create-form-engine';
import { defineInput } from '@/types';
import { anyValue } from '../lib/any-value';

const engine = createFormEngine({
	elements: [
		defineInput({
			value: anyValue,
			$type: 'input',
			schema: z.looseObject({ $type: z.literal('input'), name: z.string() }),
			metadata: { name: 'Input', category: 'input' },
			render: (_props: Record<string, unknown>) => null,
		}),
		defineInput({
			$type: 'rows',
			containerKind: 'array',
			schema: z.looseObject({
				$type: z.literal('rows'),
				name: z.string(),
				elements: z.optional(z.array(z.looseObject({ $type: z.string() }))),
			}),
			metadata: { name: 'Rows', category: 'input' },
			render: (_props: Record<string, unknown>) => null,
		}),
		defineInput({
			$type: 'group',
			containerKind: 'object',
			schema: z.looseObject({
				$type: z.literal('group'),
				name: z.string(),
				elements: z.optional(z.array(z.looseObject({ $type: z.string() }))),
			}),
			metadata: { name: 'Group', category: 'input' },
			render: (_props: Record<string, unknown>) => null,
		}),
	],
});

const show = (field: string) => [{ field, operator: 'equals', value: true, action: 'show' }];
const input = (name: string) => ({ $type: 'input', name });
const step = (id: string, elements: unknown[], extra: Record<string, unknown> = {}) => ({
	id,
	title: id,
	elements,
	...extra,
});
const form = (steps: unknown[], extra: Record<string, unknown> = {}) => ({ id: 'wizard', steps, ...extra });

describe('step constraints and navigation in a form config', () => {
	test('a step keeps show and hide constraints on fields of an earlier step, and the form defaults to linear navigation', () => {
		const config = engine.validateForm(
			form([
				step('contact', [input('hasCompany'), { $type: 'group', name: 'owner', elements: [input('adult')] }]),
				step('company', [input('company')], { constraints: show('hasCompany') }),
				step('owner', [input('detail')], {
					constraints: [{ field: 'owner.adult', operator: 'equals', value: true, action: 'hide' }],
				}),
			]),
		);
		expect(config.steps[1]?.constraints).toEqual(show('hasCompany'));
		expect(config.navigation).toBe('linear');
		expect(engine.validateForm(form([step('only', [input('a')])], { navigation: 'free' })).navigation).toBe('free');
	});

	test('a step constraint other than show or hide is rejected', () => {
		expect(() =>
			engine.validateForm(
				form([
					step('a', [input('x')]),
					step('b', [input('y')], {
						constraints: [{ field: 'x', operator: 'equals', value: true, action: 'require' }],
					}),
				]),
			),
		).toThrow(/steps.*constraints/is);
	});

	test('an unknown navigation setting is rejected', () => {
		expect(() => engine.validateForm(form([step('a', [input('x')])], { navigation: 'jump' }))).toThrow(
			/navigation/i,
		);
	});

	test('the unused step rules are gone from the shape', () => {
		expect(() => engine.validateForm(form([step('a', [input('x')], { rules: { anything: true } })]))).not.toThrow();
		expect(
			engine.validateForm(form([step('a', [input('x')], { rules: { anything: true } })])).steps[0],
		).not.toHaveProperty('rules');
	});

	test('duplicate step ids are rejected, naming the second step', () => {
		expect(() => engine.validateForm(form([step('a', [input('x')]), step('a', [input('y')])]))).toThrow(
			/steps\[1\].*duplicate/is,
		);
	});

	test('constraints on the first step are rejected', () => {
		expect(() =>
			engine.validateForm(form([step('a', [input('x')], { constraints: show('x') }), step('b', [input('y')])])),
		).toThrow(/first step/i);
	});

	test('a constraint may not read a field of its own or a later step', () => {
		expect(() =>
			engine.validateForm(form([step('a', [input('x')]), step('b', [input('y')], { constraints: show('y') })])),
		).toThrow(/earlier step/i);
		expect(() =>
			engine.validateForm(
				form([
					step('a', [input('x')]),
					step('b', [input('y')], { constraints: show('z') }),
					step('c', [input('z')]),
				]),
			),
		).toThrow(/earlier step/i);
	});

	test('a constraint may not read a field inside an array row', () => {
		expect(() =>
			engine.validateForm(
				form([
					step('a', [{ $type: 'rows', name: 'contacts', elements: [input('vip')] }]),
					step('b', [input('y')], { constraints: show('contacts.vip') }),
				]),
			),
		).toThrow(/row/i);
	});

	test('the issues are reported together with their paths', () => {
		const result = engine.safeValidateForm(
			form([
				step('a', [input('x')], { constraints: show('x') }),
				step('a', [input('y')], { constraints: show('nope') }),
			]),
		);
		expect(result.success).toBe(false);
		if (result.success) return;
		expect(result.issues.map(({ path }) => path.join('.'))).toEqual(
			expect.arrayContaining(['steps.0.constraints', 'steps.1.id', 'steps.1.constraints.0.field']),
		);
	});
});

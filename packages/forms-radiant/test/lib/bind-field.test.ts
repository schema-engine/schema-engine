import { describe, expect, test } from 'vitest';
import { createFormEngine } from '@schema-engine/forms';
import { createDefaultValidationRegistry } from '@schema-engine/forms/schemas/validation';
import { renderWithOwningFormEngine } from '@/contexts/form-engine-owner';
import { bindField } from '@/lib/bind-field';

describe('bindField', () => {
	test('maps fieldGroupProps from config', () => {
		const { fieldGroupProps, isRequired } = bindField({
			name: 'email',
			id: 'email-id',
			label: 'Email',
			description: 'Work email',
			disabled: true,
			defaultValue: 'a@b.co',
			grid: { column: '1 / -1' },
			rules: [{ type: 'required', message: 'Required' }],
		});

		expect(isRequired).toBe(true);
		expect(fieldGroupProps).toMatchObject({
			name: 'email',
			label: 'Email',
			htmlFor: 'email-id',
			hiddenLabel: false,
			required: true,
			description: 'Work email',
			disabled: true,
			defaultValue: 'a@b.co',
			grid: { column: '1 / -1' },
		});
	});

	test('uses field name as label when label is omitted', () => {
		const { fieldGroupProps } = bindField({ name: 'nickname' });
		expect(fieldGroupProps.label).toBe('nickname');
		expect(fieldGroupProps.hiddenLabel).toBe(true);
	});

	test('merges htmlAttributes under engine control props', () => {
		const { controlProps } = bindField(
			{
				name: 'email',
				id: 'engine-id',
				htmlAttributes: { 'data-testid': 'email-field', id: 'author-id' },
			},
			{ type: 'email' },
		);

		expect(controlProps).toEqual({
			'data-testid': 'email-field',
			type: 'email',
			id: 'engine-id',
			name: 'email',
			disabled: undefined,
		});
	});

	test('lets controlOverrides replace baseline identity keys', () => {
		const { controlProps } = bindField({ name: 'masked', id: 'field-id' }, { inputId: 'field-id', mask: '00-00' });

		expect(controlProps.inputId).toBe('field-id');
		expect(controlProps.mask).toBe('00-00');
		expect(controlProps.id).toBe('field-id');
	});

	test('resolves validationRules from the owning engine registry', () => {
		const registry = createDefaultValidationRegistry();
		const engine = createFormEngine({ validation: { registry } });

		const bound = renderWithOwningFormEngine(engine, () =>
			bindField({
				$type: 'input',
				name: 'email',
				rules: [{ type: 'email', message: 'Invalid email' }],
			}),
		);

		expect(bound.fieldGroupProps.validationRules).toEqual([{ type: 'email', message: 'Invalid email' }]);
	});

	test('hostProps serializes hydration attributes from fieldGroupProps', () => {
		const { hostProps } = bindField({
			name: 'agree',
			rules: [{ type: 'required', message: 'Required' }],
			defaultValue: true,
		});

		expect(hostProps.name).toBe('agree');
		expect(hostProps.defaultValueData).toBe('true');
		expect(hostProps['data-se-validation-rules']).toBe(JSON.stringify([{ type: 'required', message: 'Required' }]));
		expect(hostProps['data-se-field-rules']).toContain('"required"');
	});

	test('throws when name is missing', () => {
		expect(() => bindField({ name: '' })).toThrow(/missing required "name"/);
	});
});

import { withRadiantServerCustomElementRenderBridge } from '@ecopages/radiant/server/radiant-element-ssr';
import { renderToString } from '@ecopages/jsx/server';
import { jsx } from '@ecopages/jsx/jsx-runtime';
import { FormField } from '@/elements/form-field';
import { FormTextarea } from '@/elements/inputs/form-textarea';
import { FormSelect } from '@/elements/inputs/form-select';
import { FormCheckbox } from '@/elements/inputs/form-checkbox';
import { FormSlider } from '@/elements/inputs/form-slider';
import { TextareaFieldSchema } from '@/elements/inputs/form-textarea.types';
import { SelectFieldConfigSchema } from '@/elements/inputs/form-select.types';
import { CheckboxFieldConfigSchema } from '@/elements/inputs/form-checkbox.types';
import { SliderFieldConfigSchema } from '@/elements/inputs/form-slider.types';
import { ConfiguredRuiForm } from '@/adapters/radiant/rui-form-shell';
import { FormInput } from '@/elements/inputs/form-input';
import { FormPhoneInput } from '@/elements/inputs/form-phone-input';
import { InputFieldSchema } from '@/elements/inputs/form-input.types';
import { PhoneInputFieldSchema } from '@/elements/inputs/form-phone-input.types';
import { renderWithOwningFormEngine } from '@/contexts/form-engine-owner';
import { FormElement } from '@/components/internals/field-renderer';
import { createHydrationEngine } from './hydration-engine';

await import('@/components/form-instance.script');

export function renderHydrationHtml(): string {
	return withRadiantServerCustomElementRenderBridge(() => {
		const engine = createHydrationEngine();
		const rules = [{ $type: 'relate', fields: ['password'], assert: 'allEqual', message: 'Must match password' }];
		const config = engine.validateForm({
			id: 'hydration',
			steps: [
				{
					id: 'main',
					title: 'Main',
					elements: [
						{ $type: 'textarea', id: 'street', name: 'address.street' },
						{ $type: 'textarea', id: 'confirm', name: 'confirm', rules },
						{ $type: 'select', id: 'choice', name: 'choice', options: [{ value: 'x', label: 'X' }], rules },
						{ $type: 'checkbox', id: 'accepted', name: 'accepted', rules },
						{ $type: 'slider', id: 'amount', name: 'amount', rules },
						{ $type: 'input', id: 'contact', name: 'contact' },
						{ $type: 'phone-input', id: 'phone', name: 'phone' },
						{
							$type: 'input',
							id: 'vat',
							name: 'vat',
							constraints: [{ field: 'contact', operator: 'equals', value: 'show', $type: 'show' }],
						},
					],
				},
			],
		});
		const fields = [
			jsx(FormField, {
				name: 'address.street',
				children: jsx('input', {
					name: 'address.street',
					'data-rui-control': '',
					'data-rui-control-type': 'text',
				}),
			}),
			jsx(FormTextarea, TextareaFieldSchema.parse({ $type: 'textarea', id: 'confirm', name: 'confirm', rules })),
			jsx(
				FormSelect,
				SelectFieldConfigSchema.parse({
					$type: 'select',
					id: 'choice',
					name: 'choice',
					options: [{ value: 'x', label: 'X' }],
					rules,
				}),
			),
			jsx(
				FormCheckbox,
				CheckboxFieldConfigSchema.parse({ $type: 'checkbox', id: 'accepted', name: 'accepted', rules }),
			),
			jsx(FormSlider, SliderFieldConfigSchema.parse({ $type: 'slider', id: 'amount', name: 'amount', rules })),
			...renderWithOwningFormEngine(engine, () => [
				FormInput(InputFieldSchema.parse({ $type: 'input', id: 'contact', name: 'contact' })),
				FormPhoneInput(PhoneInputFieldSchema.parse({ $type: 'phone-input', id: 'phone', name: 'phone' })),
				FormElement({
					config: engine.validateElement({
						$type: 'input',
						id: 'vat',
						name: 'vat',
						constraints: [{ field: 'contact', operator: 'equals', value: 'show', $type: 'show' }],
					}),
					engine,
				}),
			]),
		];
		return renderToString(
			jsx('se-form-instance', {
				'prop:config': config,
				children: jsx(ConfiguredRuiForm, { config, children: fields }),
			}),
			{ mode: 'plain' },
		);
	});
}

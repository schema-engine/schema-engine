/** @jsxImportSource react */
import * as z from 'zod/mini';
import { BaseFieldSchema, defineInput } from '@schema-engine/forms';
import { fieldText, useFormField } from '@schema-engine/forms-react/hooks';

const InputSchema = z.extend(BaseFieldSchema, {
	$type: z.literal('input'),
	inputType: z.optional(z.enum(['text', 'email', 'password'])),
});

function InputField(config: z.output<typeof InputSchema>) {
	const { defaultValue, error, fieldProps, labelProps, errorProps } = useFormField(config);
	return (
		<div>
			<label {...labelProps}>{config.label}</label>
			<input {...fieldProps} type={config.inputType ?? 'text'} defaultValue={fieldText(defaultValue)} />
			{errorProps && <p {...errorProps}>{error}</p>}
		</div>
	);
}

const SelectSchema = z.extend(BaseFieldSchema, {
	$type: z.literal('select'),
	options: z.array(z.object({ value: z.string(), label: z.string() })),
});

function SelectField(config: z.output<typeof SelectSchema>) {
	const { defaultValue, error, fieldProps, labelProps, errorProps } = useFormField(config);
	return (
		<div>
			<label {...labelProps}>{config.label}</label>
			<select {...fieldProps} defaultValue={fieldText(defaultValue)}>
				<option value="">{config.placeholder}</option>
				{config.options.map((option) => (
					<option key={option.value} value={option.value}>
						{option.label}
					</option>
				))}
			</select>
			{errorProps && <p {...errorProps}>{error}</p>}
		</div>
	);
}

const input = defineInput({
	$type: 'input',
	schema: InputSchema,
	render: InputField,
	value: () => z.string(),
	metadata: { name: 'Input', category: 'input' },
});

const select = defineInput({
	$type: 'select',
	schema: SelectSchema,
	render: SelectField,
	value: ({ options }) => z.enum(options.map((option) => option.value)),
	metadata: { name: 'Select', category: 'input' },
});

export const elements = [input, select];

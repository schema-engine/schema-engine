/** @jsxImportSource react */
import * as z from 'zod/mini';
import { BaseFieldSchema, defineInput, defineStatic } from '@schema-engine/forms';
import { fieldText, useFormField } from '@schema-engine/forms-react/hooks';

const InputSchema = z.extend(BaseFieldSchema, {
	$type: z.literal('input'),
	inputType: z.optional(z.enum(['text', 'email', 'password', 'url'])),
});

function InputField(config: z.output<typeof InputSchema>) {
	const { defaultValue, error, fieldProps, labelProps, errorProps } = useFormField(config);
	return (
		<div>
			<label {...labelProps}>{config.label}</label>
			<input
				{...fieldProps}
				type={config.inputType ?? 'text'}
				placeholder={config.placeholder}
				defaultValue={fieldText(defaultValue)}
			/>
			{errorProps && <p {...errorProps}>{error}</p>}
		</div>
	);
}

const TextareaSchema = z.extend(BaseFieldSchema, { $type: z.literal('textarea'), rows: z.optional(z.number()) });

function TextareaField(config: z.output<typeof TextareaSchema>) {
	const { defaultValue, error, fieldProps, labelProps, errorProps } = useFormField(config);
	return (
		<div>
			<label {...labelProps}>{config.label}</label>
			<textarea {...fieldProps} rows={config.rows} defaultValue={fieldText(defaultValue)} />
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

const SubmitSchema = z.extend(BaseFieldSchema, { $type: z.literal('submit') });

function SubmitButton(config: z.output<typeof SubmitSchema>) {
	return <button type="submit">{config.label}</button>;
}

const input = defineInput({
	$type: 'input',
	schema: InputSchema,
	render: InputField,
	value: () => z.string(),
	metadata: { name: 'Input', category: 'input' },
});

const textarea = defineInput({
	$type: 'textarea',
	schema: TextareaSchema,
	render: TextareaField,
	value: () => z.string(),
	metadata: { name: 'Textarea', category: 'input' },
});

const select = defineInput({
	$type: 'select',
	schema: SelectSchema,
	render: SelectField,
	value: ({ options }) => z.enum(options.map((option) => option.value)),
	metadata: { name: 'Select', category: 'input' },
});

const submit = defineStatic({
	$type: 'submit',
	schema: SubmitSchema,
	render: SubmitButton,
	metadata: { name: 'Submit', category: 'action' },
});

export const elements = [input, textarea, select, submit];

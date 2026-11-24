/** @jsxImportSource react */
import * as z from 'zod/mini';
import { BaseFieldSchema, defineInput, defineStatic } from '@schema-engine/forms';
import { fieldText, useFormField } from '@schema-engine/forms-react/hooks';

const InputSchema = z.extend(BaseFieldSchema, {
	$type: z.literal('input'),
	inputType: z.optional(z.enum(['text', 'email'])),
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

const submit = defineStatic({
	$type: 'submit',
	schema: SubmitSchema,
	render: SubmitButton,
	metadata: { name: 'Submit', category: 'action' },
});

export const elements = [input, submit];

import * as z from 'zod/mini';
import { defineInput } from '@schema-engine/forms';
import { BaseFieldSchema } from '@schema-engine/forms/schemas';
import { fieldText, useFormField } from '@schema-engine/forms-react/hooks';

const TextFieldSchema = z.extend(BaseFieldSchema, {
	$type: z.literal('text'),
	inputType: z._default(z.enum(['text', 'email']), 'text'),
});

function TextField(config: z.output<typeof TextFieldSchema>) {
	const { defaultValue, error, fieldProps, labelProps, errorProps } = useFormField(config);
	return (
		<div>
			<label {...labelProps}>{config.label}</label>
			<input {...fieldProps} type={config.inputType} defaultValue={fieldText(defaultValue)} />
			{errorProps && <p {...errorProps}>{error}</p>}
		</div>
	);
}

export const textFieldRegistration = defineInput({
	$type: 'text',
	schema: TextFieldSchema,
	metadata: { name: 'Text', category: 'input' },
	value: () => z.string(),
	render: TextField,
});

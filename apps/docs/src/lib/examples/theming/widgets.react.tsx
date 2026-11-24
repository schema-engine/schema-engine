/** @jsxImportSource react */
import * as z from 'zod/mini';
import { BaseFieldSchema, defineInput } from '@schema-engine/forms';
import { fieldText, useFieldHost, useFormField } from '@schema-engine/forms-react/hooks';

const InputSchema = z.extend(BaseFieldSchema, {
	$type: z.literal('input'),
	inputType: z.optional(z.enum(['text', 'email', 'password'])),
});

/** The host from `useFieldHost` carries the grid placement and the theme id, so `grid: { width: 'half' }` works. */
function InputField(config: z.output<typeof InputSchema>) {
	const { defaultValue, error, fieldProps, labelProps, errorProps } = useFormField(config);
	const host = useFieldHost(config.grid, config.style);
	return (
		<div {...host}>
			<label {...labelProps}>{config.label}</label>
			<input {...fieldProps} type={config.inputType ?? 'text'} defaultValue={fieldText(defaultValue)} />
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

export const elements = [input];

import * as z from 'zod/mini';
import { RuiFieldError } from '@ecopages/radiant-ui/field';
import { RuiInput } from '@ecopages/radiant-ui/input';
import { RuiLabel } from '@ecopages/radiant-ui/label';
import { defineInput } from '@schema-engine/forms';
import { BaseFieldSchema } from '@schema-engine/forms/schemas';
import { FormField } from '@schema-engine/forms-radiant/primitives';

const TextFieldSchema = z.extend(BaseFieldSchema, {
	$type: z.literal('text'),
	inputType: z._default(z.enum(['text', 'email']), 'text'),
});

function TextField(config: z.output<typeof TextFieldSchema>) {
	return (
		<FormField name={config.name}>
			<RuiLabel htmlFor={config.id}>{config.label}</RuiLabel>
			<RuiInput id={config.id} name={config.name} type={config.inputType} />
			<RuiFieldError />
		</FormField>
	);
}

export const textFieldRegistration = defineInput({
	$type: 'text',
	schema: TextFieldSchema,
	metadata: { name: 'Text', category: 'input' },
	value: () => z.string(),
	render: TextField,
});

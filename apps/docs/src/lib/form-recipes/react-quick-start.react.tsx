/** @jsxImportSource react */
import { useState } from 'react';
import * as z from 'zod/mini';
import { BaseFieldSchema, createFormEngine, defineInput, defineStatic, type FormValues } from '@schema-engine/forms';
import { FormRenderer } from '@schema-engine/forms-react';
import { fieldText, useFormField } from '@schema-engine/forms-react/hooks';

const TextSchema = z.extend(BaseFieldSchema, {
	$type: z.literal('text'),
	inputType: z.optional(z.enum(['text', 'email'])),
});

function TextField(config: z.output<typeof TextSchema>) {
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

const text = defineInput({
	$type: 'text',
	schema: TextSchema,
	render: TextField,
	value: () => z.string(),
	metadata: { name: 'Text', category: 'input' },
});

const submit = defineStatic({
	$type: 'submit',
	schema: SubmitSchema,
	render: SubmitButton,
	metadata: { name: 'Submit', category: 'action' },
});

export const engine = createFormEngine({ elements: [text, submit] });

export const contactForm = engine.defineForm({
	id: 'contact',
	steps: [
		{
			id: 'details',
			title: 'Your details',
			elements: [
				{
					$type: 'text',
					id: 'name',
					name: 'name',
					label: 'Name',
					rules: [{ $type: 'required', message: 'Enter your name' }],
				},
				{
					$type: 'text',
					id: 'email',
					name: 'email',
					label: 'Email',
					inputType: 'email',
					rules: [
						{ $type: 'required', message: 'Enter your email' },
						{ $type: 'email', message: 'Enter a valid email address' },
					],
				},
				{ $type: 'submit', id: 'send', name: 'send', label: 'Send' },
			],
		},
	],
});

export function ContactForm() {
	const [values, setValues] = useState<FormValues>();
	return (
		<>
			<FormRenderer engine={engine} config={contactForm} onSubmit={setValues} />
			{values && <pre data-testid="submitted">{JSON.stringify(values)}</pre>}
		</>
	);
}

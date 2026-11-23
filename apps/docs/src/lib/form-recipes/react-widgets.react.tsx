/** @jsxImportSource react */
import * as z from 'zod/mini';
import { createFormEngine, defineInput } from '@schema-engine/forms';
import { BaseFieldSchema } from '@schema-engine/forms/schemas/base-field';
import { fieldText, useFormField } from '@schema-engine/forms-react/hooks';

const TextSchema = z.extend(BaseFieldSchema, { $type: z.literal('text') });

/** A native control: uncontrolled, so a keystroke renders nothing. */
function TextField(config: z.output<typeof TextSchema>) {
	const { defaultValue, error, fieldProps, labelProps, errorProps } = useFormField(config);
	return (
		<div>
			<label {...labelProps}>{config.label}</label>
			<input {...fieldProps} defaultValue={fieldText(defaultValue)} />
			{errorProps && <p {...errorProps}>{error}</p>}
		</div>
	);
}

const RatingSchema = z.extend(BaseFieldSchema, { $type: z.literal('rating'), max: z._default(z.number(), 5) });

/** A component that takes `value` and `onChange`: controlled, so it renders with its value. */
function RatingField(config: z.output<typeof RatingSchema>) {
	const { value, onChange, onBlur, fieldProps, error, errorProps } = useFormField(config, { controlled: true });
	return (
		<div role="radiogroup" aria-label={config.label} onBlur={onBlur}>
			{Array.from({ length: config.max }, (_, index) => index + 1).map((star) => (
				<button
					key={star}
					type="button"
					ref={star === 1 ? fieldProps.ref : undefined}
					aria-pressed={value === star}
					onClick={() => onChange(star)}
				>
					{star}
				</button>
			))}
			{errorProps && <p {...errorProps}>{error}</p>}
		</div>
	);
}

const SubmitSchema = z.extend(BaseFieldSchema, { $type: z.literal('submit') });

function SubmitButton(config: z.output<typeof SubmitSchema>) {
	return <button type="submit">{config.label}</button>;
}

const TextRegistration = defineInput({
	$type: 'text',
	schema: TextSchema,
	render: TextField,
	metadata: { name: 'Text', category: 'input' },
});

const RatingRegistration = defineInput({
	$type: 'rating',
	schema: RatingSchema,
	render: RatingField,
	metadata: { name: 'Rating', category: 'input' },
});

const SubmitRegistration = defineInput({
	$type: 'submit',
	schema: SubmitSchema,
	render: SubmitButton,
	metadata: { name: 'Submit', category: 'input' },
});

export const engine = createFormEngine({ elements: [TextRegistration, RatingRegistration, SubmitRegistration] });

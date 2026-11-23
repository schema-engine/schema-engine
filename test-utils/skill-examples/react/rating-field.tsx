import * as z from 'zod/mini';
import { defineInput, BaseFieldSchema } from '@schema-engine/forms';
import { useFormField } from '@schema-engine/forms-react/hooks';

const RatingFieldSchema = z.extend(BaseFieldSchema, {
	$type: z.literal('rating'),
	max: z._default(z.number().check(z.int(), z.positive()), 5),
});

function StarRating(props: { value: number; max: number; onChange: (value: number) => void; onBlur: () => void }) {
	return Array.from({ length: props.max }, (_, index) => (
		<button
			key={index}
			type="button"
			aria-pressed={props.value === index + 1}
			aria-label={`${index + 1} stars`}
			onClick={() => props.onChange(index + 1)}
			onBlur={props.onBlur}
		/>
	));
}

function RatingField(config: z.output<typeof RatingFieldSchema>) {
	const { value, onChange, onBlur, fieldProps, labelProps } = useFormField(config, { controlled: true });
	const { ref, 'aria-invalid': invalid } = fieldProps;
	return (
		<fieldset ref={ref} aria-invalid={invalid}>
			<legend id={labelProps.htmlFor}>{config.label}</legend>
			<StarRating value={Number(value) || 0} max={config.max} onChange={onChange} onBlur={onBlur} />
		</fieldset>
	);
}

export const ratingFieldRegistration = defineInput({
	$type: 'rating',
	schema: RatingFieldSchema,
	metadata: { name: 'Rating', category: 'input' },
	value: (config) => z.number().check(z.int(), z.gte(1), z.lte(config.max)),
	render: RatingField,
});

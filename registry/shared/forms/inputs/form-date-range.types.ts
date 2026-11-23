import * as z from 'zod/mini';
import { BaseFieldSchema } from '@schema-engine/forms';

export const DateRangeValueSchema = z.object({
	from: z.optional(z.string()),
	to: z.optional(z.string()),
});

export const DateRangeFieldExtensionSchema = z.object({
	placeholder: z.optional(z.string()),
	dateFormat: z.optional(z.string()),
	min: z.optional(z.string()),
	max: z.optional(z.string()),
	numberOfMonths: z._default(z.optional(z.number().check(z.int(), z.gte(1), z.lte(2))), 2),
	presets: z._default(z.optional(z.boolean()), true),
	autoFocus: z.optional(z.boolean()),
});

export const DateRangeFieldSchema = z.extend(BaseFieldSchema, {
	$type: z.literal('date-range'),
	...DateRangeFieldExtensionSchema.shape,
});

export type DateRangeFieldConfig = z.infer<typeof DateRangeFieldSchema>;
export type DateRangeValue = z.infer<typeof DateRangeValueSchema>;

export type DateRangeFieldProps = DateRangeFieldConfig & {
	onChange?: (value: DateRangeValue) => void;
	onBlur?: () => void;
	onFocus?: () => void;
};

export const dateRangeFieldExample: DateRangeFieldConfig = {
	$type: 'date-range',
	name: 'tripDates',
	label: 'Trip dates',
	description: 'Select your travel dates',
	placeholder: 'Pick a date range',
	numberOfMonths: 2,
	presets: true,
};

/** The value a date range writes: the ISO dates it starts and ends on, each absent until picked. */
export const dateRangeFieldValue = () => DateRangeValueSchema;

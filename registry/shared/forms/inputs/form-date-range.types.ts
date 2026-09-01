import { z } from 'zod';
import { BaseFieldSchema } from '@schema-engine/forms/schemas/base-field';

export const DateRangeValueSchema = z.object({
	from: z.string().optional(),
	to: z.string().optional(),
});

export const DateRangeFieldExtensionSchema = z.object({
	placeholder: z.string().optional(),
	dateFormat: z.string().optional(),
	min: z.string().optional(),
	max: z.string().optional(),
	numberOfMonths: z.number().int().min(1).max(2).optional().default(2),
	presets: z.boolean().optional().default(true),
	autoFocus: z.boolean().optional(),
});

export const DateRangeFieldSchema = BaseFieldSchema.extend({
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

import { z } from 'zod';
import { BaseFieldSchema } from '@schema-engine/forms/schemas/base-field';
import { ValidationRuleSchema, type ValidationRule } from '@schema-engine/forms/schemas/validation';

export const DateFieldExtensionSchema = z.object({
	placeholder: z.string().optional(),
	dateFormat: z.string().optional(),
	min: z.string().optional(),
	max: z.string().optional(),
	autoFocus: z.boolean().optional(),
});

export const DateFieldSchema = BaseFieldSchema.extend({
	$type: z.literal('date'),
	...DateFieldExtensionSchema.shape,
	rules: z
		.array(ValidationRuleSchema)
		.optional()
		.transform((rules) => {
			if (rules?.some((rule) => rule.type === 'date')) {
				return rules;
			}

			return [...(rules ?? []), { type: 'date' as const }];
		}),
});

export type DateFieldConfig = Omit<z.infer<typeof DateFieldSchema>, 'rules'> & {
	rules?: ValidationRule[];
};

export type DateFieldProps = DateFieldConfig & {
	onChange?: (value: string) => void;
	onBlur?: () => void;
	onFocus?: () => void;
};

export const dateFieldExample: DateFieldConfig = {
	$type: 'date',
	name: 'startDate',
	label: 'Start date',
	description: 'Select a date',
	placeholder: 'Pick a date',
};

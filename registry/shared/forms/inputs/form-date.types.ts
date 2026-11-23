import * as z from 'zod/mini';
import { BaseFieldSchema } from '@schema-engine/forms/schemas/base-field';
import { BaseValidationRuleSchema, type BaseValidationRule } from '@schema-engine/forms/schemas/validation';

export const DateFieldExtensionSchema = z.object({
	placeholder: z.optional(z.string()),
	dateFormat: z.optional(z.string()),
	min: z.optional(z.string()),
	max: z.optional(z.string()),
	autoFocus: z.optional(z.boolean()),
});

export const DateFieldSchema = z.extend(BaseFieldSchema, {
	$type: z.literal('date'),
	...DateFieldExtensionSchema.shape,
	rules: z.pipe(
		z.optional(z.array(BaseValidationRuleSchema)),
		z.transform((rules) => {
			if (rules?.some((rule) => rule.type === 'date')) {
				return rules;
			}

			return [...(rules ?? []), { type: 'date' as const }];
		}),
	),
});

export type DateFieldConfig = Omit<z.infer<typeof DateFieldSchema>, 'rules'> & {
	rules?: BaseValidationRule[];
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

/** The value a date field writes: an ISO date. */
export const dateFieldValue = () => z.string();

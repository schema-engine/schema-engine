import { z } from 'zod';
import { BaseFieldSchema } from '@schema-engine/forms/schemas/base-field';

export const SubmitButtonSchema = BaseFieldSchema.extend({
	$type: z.literal('submit'),
	label: z.string().default('Submit'),
});

export type SubmitButtonConfig = z.infer<typeof SubmitButtonSchema>;

export type SubmitButtonProps = SubmitButtonConfig & {
	disabled?: boolean;
	onClick?: () => void;
};
